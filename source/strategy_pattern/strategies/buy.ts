import AL, { type GData, ItemName, IPosition, ItemDataTrade, PingCompensatedCharacter, Item, Tools } from "alclient"
import type { TradeItem } from "alclient/build/TradeItem.js"
import { Loop, LoopName, Strategist, Strategy, filterContexts } from "../context.js"
import {
    BuyConfig,
    DEFAULT_ITEM_CONFIG,
    HoldConfig,
    ItemConfig,
    runSanityCheckOnItemConfig,
} from "../../base/itemsNew.js"

export function getPlayerPurchaseQuantity(
    itemConfig: ItemConfig,
    forSaleItem: TradeItem,
    bot: Pick<PingCompensatedCharacter, "countItem" | "gold">,
    enableBuyForProfit = false,
    g: GData = AL.Game.G,
): number {
    const config: HoldConfig & BuyConfig = itemConfig[forSaleItem.name]
    if (!config) return 0 // Not in config
    if (bot.gold < forSaleItem.price) return 0 // We don't have enough gold

    const available = forSaleItem.q ?? 1
    const maxAffordable = forSaleItem.price > 0 ? Math.floor(bot.gold / forSaleItem.price) : available
    const maxQuantity = Math.min(available, maxAffordable)
    if (maxQuantity <= 0) return 0

    // TODO: Merge this logic with wantToBuyFromPlayer
    if (enableBuyForProfit && forSaleItem.price < forSaleItem.calculateNpcValue() + (forSaleItem.l ? 250_000 : 0)) {
        // We want to buy it to resell it for a profit
        return maxQuantity
    }

    if (
        config.buy &&
        ((typeof config.buyPrice === "number" &&
            forSaleItem.price <= config.buyPrice + (forSaleItem.l ? 250_000 : 0)) ||
            (config.buyPrice === "ponty" &&
                forSaleItem.price <=
                    forSaleItem.calculateValue() * g.multipliers.secondhands_mult + (forSaleItem.l ? 250_000 : 0)))
    ) {
        return maxQuantity
    }

    if (
        config.replenish &&
        bot.countItem(forSaleItem.name) < config.replenish &&
        forSaleItem.price <= forSaleItem.calculateValue() + (forSaleItem.l ? 250_000 : 0)
    ) {
        // We want to buy them to replenish
        return Math.min(maxQuantity, config.replenish - bot.countItem(forSaleItem.name))
    }

    return 0
}

export function getPontyUnitPrice(item: Item, g: GData = AL.Game.G): number {
    const mult = g.items[item.name]?.cash ? g.multipliers.secondhands_cash_mult : g.multipliers.secondhands_mult
    return item.calculateValue() * mult
}

export function shouldBuyFromPonty(
    itemConfig: ItemConfig,
    pontyItem: ItemDataTrade,
    bot: Pick<PingCompensatedCharacter, "esize" | "gold" | "hasItem" | "items">,
    g: GData = AL.Game.G,
): boolean {
    const config: BuyConfig = itemConfig[pontyItem.name]
    if (!config?.buy) return false

    const itemData = new Item(pontyItem, g)
    const pontyPrice = getPontyUnitPrice(itemData, g)

    if (bot.gold < (pontyItem.q ?? 1) * pontyPrice) return false // We can't afford it

    if (bot.esize <= 0) {
        if (!pontyItem.q) return false // Not stackable

        const gItem = g.items[pontyItem.name]
        if (!bot.hasItem(pontyItem.name, bot.items, { quantityLessThan: 1 + gItem.s - pontyItem.q })) return false // We can't stack it
    }

    if (typeof config.buyPrice === "number") {
        return pontyPrice <= config.buyPrice
    }
    return config.buyPrice === "ponty"
}

export type BuyStrategyOptions = {
    itemConfig: ItemConfig
    /** If available, we can do things like stacking items on one character instead of across three */
    contexts?: Strategist<PingCompensatedCharacter>[]
    /** If true, we will buy anything from another merchant that we can immediately resell to an NPC to make a profit on */
    enableBuyForProfit?: true
}

export const defaultBuyStrategyOptions: BuyStrategyOptions = {
    itemConfig: DEFAULT_ITEM_CONFIG,
}

export class BuyStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected options: BuyStrategyOptions
    protected pontyLocations: IPosition[]
    protected secondhandsListener: (data: ItemDataTrade[]) => void

    protected static pontyData = new Map<string, [Date, ItemDataTrade[]]>()

    public constructor(options: BuyStrategyOptions = defaultBuyStrategyOptions) {
        if (!options.contexts) options.contexts = []
        this.options = options
        this.pontyLocations = AL.Pathfinder.locateNPC("secondhands")

        this.loops.set("buy", {
            fn: async (bot: Type) => {
                if (bot.map.startsWith("bank")) return // Can't buy in bank
                await this.buyFromPlayers(bot).catch(console.error)
                await this.buyFromPonty(bot).catch(console.error)
                await this.buyReplenishables(bot).catch(console.error)
            },
            interval: 1000,
        })
    }

    public onApply(bot: Type) {
        // Ensure that we don't overpay for NPC items
        runSanityCheckOnItemConfig(this.options.itemConfig).catch(console.error)

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
            withinRange: AL.Constants.NPC_INTERACTION_DISTANCE,
        })
        for (const player of players) {
            for (const [tradeSlot, forSaleItem] of player.getItemsForSale()) {
                const quantity = getPlayerPurchaseQuantity(
                    this.options.itemConfig,
                    forSaleItem,
                    bot,
                    this.options.enableBuyForProfit,
                )
                if (quantity <= 0) continue // We don't want to buy it
                await bot.buyFromMerchant(player.id, tradeSlot, forSaleItem.rid, quantity)
            }
        }
    }

    protected async buyFromPonty(bot: Type) {
        if (
            this.pontyLocations.every((location) => {
                return AL.Tools.squaredDistance(bot, location) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED
            })
        )
            return // We're not close to Ponty

        let [lastChecked, pontyItems] = BuyStrategy.pontyData.get(`${bot.server.region}${bot.server.name}`) ?? [
            null,
            [],
        ]

        if (
            bot.cc < 100 &&
            (!lastChecked || // We haven't checked ponty yet
                Date.now() - lastChecked.getTime() > 30_000) // It's been 30s since we last checked
        ) {
            // Refresh ponty data
            pontyItems = await bot.getPontyItems()
        }

        for (const pontyItem of pontyItems) {
            if (!shouldBuyFromPonty(this.options.itemConfig, pontyItem, bot)) continue

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

            const gItem = AL.Game.G.items[itemName]

            if (!bot.canBuy(itemName)) {
                // We can't buy it, check if another one of our characters can
                for (const context of filterContexts(this.options.contexts, {
                    serverData: bot.serverData,
                    owner: bot.owner,
                })) {
                    const contextBot = context.bot
                    if (!contextBot.canBuy(itemName)) continue // They can't buy any either
                    if (Tools.squaredDistance(bot, contextBot) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) continue // They're too far away

                    const contextNum = contextBot.countItem(itemName)
                    const numWant = config.replenish - num
                    const numToBuy = Math.min(
                        config.replenish + numWant - contextNum,
                        Math.floor(contextBot.gold / gItem.g),
                    )
                    if (numToBuy > 0) await contextBot.buy(itemName, numToBuy) // Buy some more

                    // Transfer them
                    const slot = contextBot.locateItem(itemName, contextBot.items, { quantityGreaterThan: numWant - 1 })
                    await contextBot.sendItem(bot.id, slot, numWant)
                    break
                }
                continue
            }

            const numToBuy = Math.min(config.replenish - num, Math.floor(bot.gold / gItem.g))

            await bot.buy(itemName, numToBuy)
        }
    }
}
