import AL, { ItemName, IPosition, ItemDataTrade, PingCompensatedCharacter, Item } from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "../context.js"
import { BuyConfig, DEFAULT_ITEM_CONFIG, HoldConfig, ItemConfig, runSanityCheckOnItemConfig } from "../../base/itemsNew.js"

export type BuyStrategyOptions = {
    itemConfig: ItemConfig
    /** If available, we can do things like stacking items on one character instead of across three */
    contexts?: Strategist<PingCompensatedCharacter>[]
    /** If true, we will buy anything from another merchant that we can immediately resell to an NPC to make a profit on */
    enableBuyForProfit?: true
}

export const defaultBuyStrategyOptions: BuyStrategyOptions = {
    itemConfig: DEFAULT_ITEM_CONFIG
}

export class BuyStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected options: BuyStrategyOptions
    protected pontyLocations: IPosition[]
    protected secondhandsListener: (data: ItemDataTrade[]) => void

    protected static pontyData = new Map<string, [Date, ItemDataTrade[]]>()

    public constructor(options: BuyStrategyOptions = defaultBuyStrategyOptions) {
        this.options = options
        this.pontyLocations = AL.Pathfinder.locateNPC("secondhands")

        this.loops.set("buy", {
            fn: async (bot: Type) => {
                await this.buyFromPlayers(bot).catch(console.error)
                await this.buyFromPonty(bot).catch(console.error)
                await this.buyReplenishables(bot).catch(console.error)
            },
            interval: 1000
        })
    }

    public onApply(bot: Type) {
        // Ensure that we don't overpay for NPC items
        runSanityCheckOnItemConfig(this.options.itemConfig)

        this.secondhandsListener = (data: ItemDataTrade[]) => {
            const server = `${bot.server.region}${bot.server.name}`
            BuyStrategy.pontyData.set(server, [new Date(), data])
        }
        bot.socket.on("secondhands", this.secondhandsListener)
    }

    public onRemove(bot: Type) {
        if (this.secondhandsListener) bot.socket.removeListener("secondhands", this.secondhandsListener)
    }

    protected async buyFromPlayers(bot: Type) {
        const players = bot.getPlayers({
            withinRange: AL.Constants.NPC_INTERACTION_DISTANCE
        })
        for (const player of players) {
            for (const [tradeSlot, forSaleItem] of player.getItemsForSale()) {
                const config: HoldConfig & BuyConfig = this.options.itemConfig[forSaleItem.name]
                if (!config) continue // Not in config
                if (bot.gold < forSaleItem.price) continue // We don't have enough gold

                let wantToBuy = false

                if (
                    this.options.enableBuyForProfit
                    && forSaleItem.price < forSaleItem.calculateNpcValue()
                ) {
                    // We want to buy it to resell it for a profit
                    wantToBuy = true
                }

                if (
                    !wantToBuy
                    && config.replenish
                    && bot.countItem(forSaleItem.name) < config.replenish
                    && forSaleItem.price <= forSaleItem.calculateValue()
                ) {
                    // We want to buy them to replenish
                    wantToBuy = true
                }

                // Do we want to buy because we want it?
                if (
                    !wantToBuy
                    && config.buy
                    && (
                        (typeof config.buyPrice === "number" && forSaleItem.price <= config.buyPrice)
                        || (config.buyPrice === "ponty" && forSaleItem.price <= forSaleItem.calculateValue() * AL.Game.G.multipliers.secondhands_mult)
                    )
                ) {
                    wantToBuy = true
                }

                if (!wantToBuy) continue // We don't want to buy it
                await bot.buyFromMerchant(player.id, tradeSlot, forSaleItem.rid)
            }
        }
    }

    protected async buyFromPonty(bot: Type) {
        if (this.pontyLocations.every((location) => {
            return AL.Tools.squaredDistance(bot, location) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED
        })) return // We're not close to Ponty

        let [lastChecked, pontyItems] = BuyStrategy.pontyData.get(`${bot.server.region}${bot.server.name}`) ?? [null, []]

        if (
            bot.cc < 100
            && (
                !lastChecked // We haven't checked ponty yet
                || Date.now() - lastChecked.getTime() > 30_000 // It's been 30s since we last checked
            )
        ) {
            // Refresh ponty data
            pontyItems = await bot.getPontyItems()
        }

        for (const pontyItem of pontyItems) {
            const config: BuyConfig = this.options.itemConfig[pontyItem.name]
            if (!config) continue // No config
            if (!config.buy) continue // Don't want to buy

            const itemData = new Item(pontyItem, AL.Game.G)
            const pontyPrice = itemData.calculateNpcValue() * AL.Game.G.multipliers.lostandfound_mult

            if (bot.gold < (pontyItem.q ?? 1) * pontyPrice) continue // We can't affort it

            if (bot.esize <= 0) {
                if (!pontyItem.q) continue // Not stackable

                const gItem = AL.Game.G.items[pontyItem.name]
                if (!bot.hasItem(pontyItem.name, bot.items, { quantityLessThan: 1 + gItem.s - pontyItem.q })) continue // We can't stack it
            }

            if (typeof config.buyPrice === "number" && config.buyPrice < pontyPrice) continue // We don't want to pay ponty price
            else if (config.buyPrice !== "ponty") continue

            await bot.buyFromPonty(pontyItem)
        }
    }

    protected async buyReplenishables(bot: Type) {
        for (const key in this.options.itemConfig) {
            const itemName = key as ItemName
            const config = this.options.itemConfig[itemName]
            if (!config.replenish) continue // We don't want to replenish it
            const num = bot.countItem(itemName)
            if (num >= config.replenish) continue // We have enough

            // TODO: Check if our contexts have extra, or can buy some for us
            if (!bot.canBuy(itemName)) continue // We can't buy any

            const gItem = AL.Game.G.items[itemName]
            const numToBuy = Math.min(config.replenish - num, Math.floor(bot.gold / gItem.g))

            await bot.buy(itemName, numToBuy)
        }
    }
}