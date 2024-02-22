import AL, { GMap, ItemName, MapName, TradeSlotType, IPosition, ItemDataTrade, PingCompensatedCharacter, Item } from "alclient"
import { filterContexts, Loop, LoopName, Strategist, Strategy } from "../context.js"
import { DEFAULT_ITEMS_TO_BUY, DEFAULT_REPLENISHABLES } from "../../base/defaults.js"
import { BuyConfig, DEFAULT_ITEM_CONFIG, HoldConfig, ItemConfig, runSanityCheckOnItemConfig } from "../../base/itemsNew.js"

export type BuyStrategyOptions = {
    contexts: Strategist<PingCompensatedCharacter>[]
    /**
     * Buy these items if we can buy it for the given price (or less).
     */
    buyMap?: Map<ItemName, number>
    /**
     * If true, we will buy anything from another merchant that we can immediately resell to an NPC
     * to make a profit on
     */
    enableBuyForProfit?: true
    /**
     * Buy the given amount of each item if we have less than that amount in our inventory.
     */
    replenishables?: Map<ItemName, number>
}

export const DefaultBuyStrategyOptions: BuyStrategyOptions = {
    contexts: [],
    buyMap: DEFAULT_ITEMS_TO_BUY,
    replenishables: DEFAULT_REPLENISHABLES
}

export class BuyStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected options: BuyStrategyOptions

    protected lastPontyCheck: Date
    protected pontyLocations: IPosition[]
    protected pontyItems: ItemDataTrade[] = []

    public setOnSecondhands: (data: ItemDataTrade[]) => void

    public constructor(options: BuyStrategyOptions = DefaultBuyStrategyOptions) {
        this.options = options
        this.pontyLocations = AL.Pathfinder.locateNPC("secondhands")

        for (const [itemName, buyFor] of this.options.buyMap ?? []) {
            const gItem = AL.Game.G.items[itemName]
            if (gItem.cash) continue // Can't buy this item with gold, only cash
            const gPrice = gItem.g * (gItem.markup ?? 1)

            // Check if it's buyable from an NPC
            let buyableFromNPC = false
            for (const map in AL.Game.G.maps) {
                if (buyableFromNPC) break
                if (AL.Game.G.maps[map as MapName].ignore) continue
                for (const npc of (AL.Game.G.maps[map as MapName] as GMap).npcs) {
                    if (buyableFromNPC == true) break
                    if (!AL.Game.G.npcs[npc.id].items) continue
                    buyableFromNPC = AL.Game.G.npcs[npc.id].items.includes(itemName)
                    if (buyableFromNPC) break
                }
            }

            if (buyableFromNPC) {
                if (buyFor === undefined) {
                    // We didn't specify a price, set it to the price from G (no markup)
                    this.options.buyMap[itemName] = gItem.g
                } else if (buyFor > gPrice) {
                    console.warn(`Lowering buy price for ${itemName} to ${gPrice} to match the price the NPC sells this item for.`)
                    this.options.buyMap[itemName] = gPrice
                }
            } else if (!buyFor) {
                // Pay up to G for it
                this.options.buyMap[itemName] = gItem.g
            }
        }

        this.loops.set("buy", {
            fn: async (bot: Type) => { await this.buy(bot).catch(console.error) },
            interval: 1000
        })
    }

    public async onApply(bot: Type) {
        this.setOnSecondhands = (data: ItemDataTrade[]) => {
            this.pontyItems = data
            this.lastPontyCheck = new Date()
        }
        bot.socket.on("secondhands", this.setOnSecondhands)
    }

    public async onRemove(bot: Type) {
        if (this.setOnSecondhands) bot.socket.removeListener("secondhands", this.setOnSecondhands)
    }

    private async buy(bot: Type) {
        if (this.options.replenishables) {
            await this.buyReplenishablesFromMerchants(bot)
            await this.buyReplenishablesFromNPCs(bot)
        }
        if (this.options.buyMap) {
            await this.buyFromPonty(bot)
            await this.buyFromMerchants(bot)
        }
        if (this.options.enableBuyForProfit) await this.buyFromMerchantsForProfit(bot)
    }

    private async buyReplenishablesFromMerchants(bot: Type) {
        const players = bot.getPlayers({
            withinRange: AL.Constants.NPC_INTERACTION_DISTANCE,
        })
        for (const player of players) {
            for (const s in player.slots) {
                const slot = s as TradeSlotType
                const item = player.slots[slot]

                if (!item) continue // Nothing in the slot
                if (!item.rid) continue // Not a trade item
                if (item.b) continue // They are buying, not selling
                if (item.giveaway) continue // They are giving it away, not selling
                const amount = this.options.replenishables.get(item.name)
                if (!amount) continue // We don't want it
                if (item.price > AL.Game.G.items[item.name].g) continue // They're selling it for more than it's worth

                const num = bot.countItem(item.name)
                const numToBuy = Math.min(amount - num, item.q, Math.floor(bot.gold / item.price))
                if (numToBuy <= 0) continue // We don't want to buy any

                await bot.buyFromMerchant(player.id, slot, item.rid, numToBuy).catch(console.error)
            }
        }
    }

    private async buyReplenishablesFromNPCs(bot: Type) {
        for (const [item, amount] of this.options.replenishables) {
            if (!bot.canBuy(item)) continue // We can't buy this item

            const num = bot.countItem(item)
            const numToBuy = Math.min(amount - num, Math.floor(bot.gold / AL.Game.G.items[item].g))
            if (numToBuy <= 0) continue // We don't want to buy any

            await bot.buy(item, numToBuy).catch(console.error)
        }

        // Have our friends buy us replenishables if they have a computer and we don't
        if (bot.hasItem(["computer", "supercomputer"])) return
        for (const context of filterContexts(this.options.contexts, { owner: bot.owner, serverData: bot.serverData })) {
            const friend = context.bot
            if (friend == bot) continue // Ignore ourself
            if (!friend.hasItem(["computer", "supercomputer"])) continue // They don't have a computer
            if (AL.Tools.distance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE) continue // Too far away

            for (const [item, amount] of this.options.replenishables) {
                if (!friend.canBuy(item)) continue // They can't buy this item

                const num = bot.countItem(item)
                const costPerItem = AL.Game.G.items[item].g
                const numToBuy = Math.min(amount - num, Math.floor(bot.gold / costPerItem))
                if (numToBuy <= 0) continue // We don't want to buy any

                try {
                    // Send them the gold
                    await bot.sendGold(friend.id, numToBuy * costPerItem)
                    // Have them buy the item
                    await friend.buy(item, numToBuy)
                    // Have them send us the item
                    const itemPos = friend.locateItem(item, friend.items, { quantityGreaterThan: numToBuy - 1 })
                    if (itemPos !== undefined) {
                        await friend.sendItem(bot.id, itemPos, numToBuy)
                    }
                } catch (e) {
                    console.error(e)
                }
            }
        }
    }

    private async buyFromPonty(bot: Type) {
        if (this.pontyLocations.every((location) => {
            return AL.Tools.distance(bot, location) > AL.Constants.NPC_INTERACTION_DISTANCE
        })) return // We're not close to Ponty

        if (
            bot.cc < 100
            && (!this.lastPontyCheck || Date.now() - this.lastPontyCheck.getTime() > 30_000)
        ) {
            this.pontyItems = await bot.getPontyItems()
            this.lastPontyCheck = new Date()
        }

        for (const pontyItem of this.pontyItems) {
            const willingToPay = this.options.buyMap.get(pontyItem.name)
            if (willingToPay === undefined) continue // We don't want it

            // TODO: Check if we can stack it if we bought it
            const gItem = AL.Game.G.items[pontyItem.name]
            if (!gItem.s && bot.esize === 0) continue // No space for this item
            const pontyPrice = gItem.g * AL.Constants.PONTY_MARKUP // TODO: Use AL.Game.G.multipliers.secondhands_mult if it ever gets fixed
            if (pontyPrice * (pontyItem.q ?? 1) > bot.gold) continue // We can't afford it (with Ponty, we have to buy the whole stack if it's stackable)
            if (pontyPrice > willingToPay) continue // It's too expensive

            await bot.buyFromPonty(pontyItem)
        }
    }

    private async buyFromMerchants(bot: Type) {
        const players = bot.getPlayers({
            withinRange: AL.Constants.NPC_INTERACTION_DISTANCE,
        })
        for (const player of players) {
            for (const s in player.slots) {
                const slot = s as TradeSlotType
                const item = player.slots[slot]

                if (!item) continue // Nothing in the slot
                if (!item.rid) continue // Not a trade item
                if (item.b) continue // They are buying, not selling
                if (item.giveaway) continue // They are giving it away, not selling
                if (item.price > bot.gold) continue // We can't afford it

                const willingToPay = this.options.buyMap.get(item.name)
                if (willingToPay === undefined) continue // We don't want it
                if ((item.price + (item.l ? 250_000 : 0)) > willingToPay) continue // They're selling it for more than it's worth

                if (item.q) {
                    // Buy as many as we can
                    await bot.buyFromMerchant(player.id, slot, item.rid, Math.min(item.q, Math.floor(bot.gold / item.price)))
                } else {
                    await bot.buyFromMerchant(player.id, slot, item.rid)
                }
            }
        }
    }

    private async buyFromMerchantsForProfit(bot: Type) {
        const players = bot.getPlayers({
            withinRange: AL.Constants.NPC_INTERACTION_DISTANCE,
        })
        for (const player of players) {
            for (const s in player.slots) {
                const slot = s as TradeSlotType
                const item = player.slots[slot]

                if (!item) continue // Nothing in the slot
                if (!item.rid) continue // Not a trade item
                if (item.b) continue // They are buying, not selling
                if (item.giveaway) continue // They are giving it away, not selling
                if (item.price > bot.gold) continue // We can't afford it

                const npcValue = AL.Game.G.items[item.name].g * AL.Game.G.multipliers.buy_to_sell
                if (item.price > npcValue) continue // We can't resell it for more

                if (item.q) {
                    // Buy as many as we can
                    await bot.buyFromMerchant(player.id, slot, item.rid, Math.min(item.q, Math.floor(bot.gold / item.price)))
                } else {
                    await bot.buyFromMerchant(player.id, slot, item.rid)
                }
            }
        }
    }
}

export type NewBuyStrategyOptions = {
    itemConfig: ItemConfig
    /** If available, we can do things like stacking items on one character instead of across three */
    contexts?: Strategist<PingCompensatedCharacter>[]
    /** If true, we will buy anything from another merchant that we can immediately resell to an NPC to make a profit on */
    enableBuyForProfit?: true
}

export const defaultNewBuyStrategyOptions: NewBuyStrategyOptions = {
    itemConfig: DEFAULT_ITEM_CONFIG
}

export class NewBuyStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected options: NewBuyStrategyOptions
    protected pontyLocations: IPosition[]
    protected secondhandsListener: (data: ItemDataTrade[]) => void

    protected static pontyData = new Map<string, [Date, ItemDataTrade[]]>()

    public constructor(options: NewBuyStrategyOptions = defaultNewBuyStrategyOptions) {
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
            NewBuyStrategy.pontyData.set(server, [new Date(), data])
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

        let [lastChecked, pontyItems] = NewBuyStrategy.pontyData.get(`${bot.server.region}${bot.server.name}`)

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