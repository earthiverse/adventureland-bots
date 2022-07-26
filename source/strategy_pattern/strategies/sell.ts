import AL, { ItemName, Character, TradeSlotType } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export type SellStrategyOptions = {
    /**
     * Sell these items if they meet the following criteria
     * ItemName -> [Level, Price]
     * IMPORTANT: Only set `Price` to `undefined` if `Level` is 0. We don't have a way to check the value of higher level items yet (TODO).
     */
    sellMap?: Map<ItemName, [number, number][]>
}

export const RecommendedSellStrategyOptions: SellStrategyOptions = {
    sellMap: new Map([
        // TODO: Add more things to sell
        ["bow", [[0, undefined]]],
    ])
}

export class SellStrategy<Type extends Character> implements SellStrategyOptions, Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public sellMap: Map<ItemName, [number, number][]>

    public constructor(options: SellStrategyOptions = RecommendedSellStrategyOptions) {
        if (options.sellMap) this.sellMap = options.sellMap

        for (const [itemName, criteria] of options.sellMap) {
            const GData = AL.Game.G.items[itemName]
            const npcPrice = GData.g * 0.6
            if (criteria == undefined) {
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
                        console.warn(`Raising sell price for ${itemName}${level ?? " (level " + level + ")"} from ${sellFor} to ${npcPrice} to match the price NPCs will pay.`)
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

        this.loops.set("sell", {
            fn: async (bot: Type) => { await this.sell(bot) },
            interval: 1000
        })
    }

    private async sell(bot: Type) {
        if (this.sellMap) {
            await this.sellToMerchants(bot)
            await this.sellToNPCs(bot)
        }
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
                    const sellFor = (a[1] ?? AL.Game.G.items[item.name].g * 0.6) * (1 + bot.tax)

                    return level == item.level && item.price >= sellFor
                })) continue // They're not paying enough, or they're buying at a level we're not selling

                const index = bot.locateItem(item.name, bot.items, { level: item.level, locked: false })
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

            const criteria = this.sellMap.get(item.name)
            if (!criteria) continue // We don't want to sell this item
            if (!criteria.some((a) => {
                const level = a[0]
                if (level != item.level) return false // Not the same level

                const sellFor = a[1]
                if (sellFor !== undefined && sellFor > AL.Game.G.items[item.name].g * 0.6) return false // We want more for this item than we can get from an NPC

                return true
            })) continue // We don't want to sell this item

            await bot.sell(i, item.q ?? 1).catch(console.error)
        }
    }
}