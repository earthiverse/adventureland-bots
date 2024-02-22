import AL, { ItemName, Character, TradeSlotType } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"
import { DEFAULT_ITEM_CONFIG, ItemConfig, SellConfig, runSanityCheckOnItemConfig } from "../../base/itemsNew.js"

export type SellStrategyOptions = {
    /**
     * Sell these items if they meet the following criteria
     * ItemName -> [Level, Price]
     * IMPORTANT: Only set `Price` to `undefined` if `Level` is 0. We don't have a way to check the value of higher level items yet (TODO).
     */
    sellMap?: Map<ItemName, [number, number][]>
}

export const defaultSellStrategyOptions: SellStrategyOptions = {
    sellMap: new Map([
        // TODO: Add more things to sell
        ["bow", [[0, undefined]]],
    ])
}

export class SellStrategy<Type extends Character> implements SellStrategyOptions, Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public sellMap: Map<ItemName, [number, number][]>

    public constructor(options: SellStrategyOptions = defaultSellStrategyOptions) {
        if (options.sellMap) {
            this.sellMap = options.sellMap

            for (const [itemName, criteria] of options.sellMap) {
                const GData = AL.Game.G.items[itemName]
                const npcPrice = GData.g * 0.6
                if (!criteria) {
                    // Sell it for the NPC price
                    if (GData.upgrade || GData.compound) {
                        options.sellMap.set(itemName, [[0, npcPrice]])
                    } else {
                        options.sellMap.set(itemName, [[undefined, npcPrice]])
                    }
                    continue
                }
                for (const criterion of criteria) {
                    const level = criterion[0]
                    const sellFor = criterion[1]

                    // If price is defined, make sure it's higher than what we could sell it to an NPC for
                    if (sellFor !== undefined) {
                        if (sellFor < npcPrice) {
                            console.warn(`Raising sell price for ${itemName}${level ?? ` (level ${level})`} from ${sellFor} to ${npcPrice} to match the price NPCs will pay.`)
                            criterion[1] = npcPrice
                        }
                    }

                    if (sellFor === undefined) {
                        // TODO: Make a function that checks the item value
                        if (level > 0) {
                            console.warn(`Sell price for ${itemName} (level ${level}) is not set. Selling to NPCs only.`)
                        }
                    }
                }
            }
        }

        this.loops.set("sell", {
            fn: async (bot: Type) => { await this.sell(bot) },
            interval: 1000
        })
    }

    private async sell(bot: Type) {
        if (!this.sellMap) return
        await this.sellToMerchants(bot)
        await this.sellToNPCs(bot)
    }

    private async sellToMerchants(bot: Type) {
        const players = bot.getPlayers({
            withinRange: AL.Constants.NPC_INTERACTION_DISTANCE,
        })
        for (const player of players) {
            for (const s in player.slots) {
                const slot = s as TradeSlotType
                const item = player.slots[slot]

                if (!item) continue // Nothing in the slot
                if (!item.rid) continue // Not a trade item
                if (!item.b) continue // They are selling, not buying

                const criteria = this.sellMap.get(item.name)
                if (!criteria) continue // We don't want to sell it
                if (!criteria.some((a) => {
                    const level = a[0]
                    const sellFor = Math.max(a[1] ?? 0, (AL.Game.G.items[item.name].g * AL.Game.G.multipliers.buy_to_sell * (1 + bot.tax)))

                    return level == item.level && item.price >= sellFor
                })) continue // They're not paying enough, or they're buying at a level we're not selling

                const index = bot.locateItem(item.name, bot.items, { level: item.level, locked: false, special: false })
                if (index === undefined) continue // We don't have this item to sell
                await bot.sellToMerchant(player.id, slot, item.rid, Math.min(bot.items[index].q ?? 1, item.q ?? 1)).catch(console.error)
            }
        }
    }

    private async sellToNPCs(bot: Type) {
        if (!bot.canSell()) return

        for (let i = 0; i < bot.items.length; i++) {
            const item = bot.items[i]
            if (!item) continue // No item
            if (item.l) continue // Can't sell locked items
            if (item.p) continue // Don't sell special items

            const criteria = this.sellMap.get(item.name)
            if (!criteria) continue // We don't want to sell this item
            if (!criteria.some((a) => {
                const level = a[0]
                if (level != item.level) return false // Not the same level

                const sellFor = a[1]
                if (sellFor !== undefined && sellFor > AL.Game.G.items[item.name].g * AL.Constants.NPC_SELL_TAX) return false // We want more for this item than we can get from an NPC

                return true
            })) continue // We don't want to sell this item

            await bot.sell(i, item.q ?? 1).catch(console.error)
        }
    }
}

export type NewSellStrategyOptions = {
    itemConfig: ItemConfig
}

const defaultNewSellStrategyOptions: NewSellStrategyOptions = {
    itemConfig: DEFAULT_ITEM_CONFIG
}

export class NewSellStrategy<Type extends Character> implements Strategy<Type> {
    protected options: NewSellStrategyOptions

    public loops = new Map<LoopName, Loop<Type>>()

    public constructor(options: NewSellStrategyOptions = defaultNewSellStrategyOptions) {
        this.options = options

        this.loops.set("sell", {
            fn: async (bot: Type) => { await this.sell(bot) },
            interval: 1000
        })
    }

    public onApply(bot: Type) {
        // Ensure that we don't sell for less than we can get from an NPC
        runSanityCheckOnItemConfig(this.options.itemConfig)
    };

    protected async sell(bot: Type) {
        await this.sellToPlayers(bot)
        await this.sellToNPCs(bot)
    }

    protected async sellToPlayers(bot: Type) {
        const players = bot.getPlayers({
            withinRange: AL.Constants.NPC_INTERACTION_DISTANCE
        })
        for (const player of players) {
            for (const [tradeSlot, wantedItem] of player.getWantedItems()) {
                const config: SellConfig = this.options.itemConfig[wantedItem.name]
                if (!config) continue // Not in config
                if (!config.sell) continue // We don't want to sell

                if (typeof config.sellPrice === "number") {
                    if ((wantedItem.level ?? 0) > 0) continue // We're not selling this item if leveled
                    if (config.sellPrice > wantedItem.price) continue // We want more for it
                } else if (config.sellPrice === "npc") {
                    if ((wantedItem.level ?? 0) > 0) continue // We're not selling this item if leveled
                    if (wantedItem.calculateNpcValue() > wantedItem.price) continue // We want more for it
                } else {
                    if (!config.sellPrice[wantedItem.level ?? 0]) continue // We're not selling this item at this level
                    if (config.sellPrice[wantedItem.level ?? 0] > wantedItem.price) continue // We want more for it
                }

                const ourItemIndex = bot.locateItem(
                    wantedItem.name,
                    bot.items,
                    { level: wantedItem.level, locked: false, special: false }
                )
                if (ourItemIndex === undefined) continue // We don't have any to sell
                const ourItem = bot.items[ourItemIndex]

                // Sell it
                await bot.sellToMerchant(player.id, tradeSlot, wantedItem.rid, Math.min(ourItem.q ?? 1, wantedItem.q ?? 1)).catch(console.error)
            }
        }

        // Sell excess
        for (const player of players) {
            for (const [tradeSlot, wantedItem] of player.getWantedItems()) {
                const config: SellConfig = this.options.itemConfig[wantedItem.name]
                if (!config) continue // Not in config
                if (config.sellExcess === undefined) continue // We don't want to sell
                if (wantedItem.calculateNpcValue() > wantedItem.price) continue // We could get more selling it to an NPC
                const numWeHave = bot.countItem(wantedItem.name)
                if (numWeHave <= config.sellExcess) continue // We don't have an excess

                const ourItemIndex = bot.locateItem(
                    wantedItem.name,
                    bot.items,
                    { level: wantedItem.level, locked: false, special: false }
                )
                if (ourItemIndex === undefined) continue // We don't have any to sell
                const ourItem = bot.items[ourItemIndex]

                // Sell it
                await bot.sellToMerchant(player.id, tradeSlot, wantedItem.rid, ourItem.q ? Math.min(numWeHave - config.sellExcess, ourItem.q) : 1).catch(console.error)
            }
        }
    }

    protected async sellToNPCs(bot: Type) {
        if (!bot.canSell()) return

        for (const [i, item] of bot.getItems()) {
            if (item.l) continue // Can't sell locked items
            if (item.p) continue // Don't sell special items

            const config: SellConfig = this.options.itemConfig[item.name]
            if (!config) continue // Not in config
            if (!config.sell) continue // We don't want to sell
            const npcOffer = item.calculateNpcValue()

            if (typeof config.sellPrice === "number") {
                if (item.level ?? 0) continue // We're not selling this item if leveled
                if (config.sellPrice > npcOffer) continue // We want more than NPC price
            } else if (Array.isArray(config.sellPrice)) {
                if (!config.sellPrice[item.level ?? 0]) continue // We're not selling this item at this level
                if (config.sellPrice[item.level ?? 0] > npcOffer) continue // We want more than NPC price
            } else if (config.sellPrice === "npc") {
                if (item.level ?? 0) continue // We're not selling this item if leveled
            }

            await bot.sell(i, item.q ?? 1)
        }

        // Sell excess
        for (const [i, item] of bot.getItems()) {
            const config: SellConfig = this.options.itemConfig[item.name]
            if (!config) continue // Not in config
            if (config.sellExcess === undefined) continue // We don't want to sell
            const numWeHave = bot.countItem(item.name)
            if (numWeHave <= config.sellExcess) continue // We don't have an excess

            await bot.sell(i, item.q ? Math.min(numWeHave - config.sellExcess, item.q) : 1)
        }
    }
}