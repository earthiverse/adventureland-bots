import AL, { GMap, ItemName, MapName, Merchant, TradeSlotType } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export type BuyStrategyOptions = {
    /**
     * Buy these items if we can buy it for the given price (or less).
     */
    buyMap?: Map<ItemName, number>
    /**
     * Buy the given amount of each item if we have less than that amount in our inventory.
     */
    replenishables?: Map<ItemName, number>
}

export const RecommendedBuyStrategyOptions: BuyStrategyOptions = {
    buyMap: new Map<ItemName, number>([
        ["t3bow", undefined]
    ]),
    replenishables: new Map<ItemName, number>([
        ["mpot1", 9999],
        ["hpot1", 9999],
        ["elixirluck", 1],
        ["xptome", 1]
    ])
}

export class BuyStrategy<Type extends Merchant> implements BuyStrategyOptions, Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public buyMap: Map<ItemName, number>
    public replenishables: Map<ItemName, number>

    public constructor(options: BuyStrategyOptions = RecommendedBuyStrategyOptions) {
        if (options.buyMap) this.buyMap = options.buyMap
        if (options.replenishables) this.replenishables = options.replenishables

        for (const [itemName, buyFor] of this.buyMap) {
            const gItem = AL.Game.G.items[itemName]
            const gPrice = gItem.g * (gItem.markup ?? 1)

            // Check if it's buyable from an NPC
            let buyableFromNPC = false
            for (const map in AL.Game.G.maps) {
                if (buyableFromNPC) break
                if (AL.Game.G.maps[map as MapName].ignore) continue
                for (const npc of (AL.Game.G.maps[map as MapName] as GMap).npcs) {
                    if (buyableFromNPC == true) break
                    if (AL.Game.G.npcs[npc.id].items == undefined) continue
                    buyableFromNPC = AL.Game.G.npcs[npc.id].items.includes(itemName)
                    if (buyableFromNPC) break
                }
            }

            if (buyableFromNPC) {
                if (buyFor == undefined) {
                    // We didn't specify a price, set it to the price from G (no markup)
                    this.buyMap[itemName] = gItem.g
                } else if (buyFor > gPrice) {
                    console.warn(`Lowering buy price for ${itemName} to ${gPrice} to match the price the NPC sells this item for.`)
                    this.buyMap[itemName] = gPrice
                }
            } else {
                // Pay up to G for it
                this.buyMap[itemName] = gItem.g
            }
        }

        this.loops.set("buy", {
            fn: async (bot: Type) => { await this.buy(bot) },
            interval: 1000
        })
    }

    private async buy(bot: Type) {
        if (this.replenishables) {
            await this.buyReplenishablesFromMerchants(bot)
            await this.buyReplenishablesFromNPCs(bot)
        }
        if (this.buyMap) {
            // TODO: Add a function to buy things from ponty
        }
        // TODO: Add a function to buy things from merchants that we can make a profit on
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
                const amount = this.replenishables.get(item.name)
                if (!amount) continue // We don't want it
                if (item.price > AL.Game.G.items[item.name].g) continue // They're selling it for more than it's worth

                const num = bot.countItem(item.name)
                const numToBuy = Math.min(amount - num, item.q, Math.floor(bot.gold / item.price))
                if (numToBuy <= 0) continue // We don't want to buy any

                await bot.buyFromMerchant(player.id, slot, item.rid, numToBuy)
            }
        }
    }

    private async buyReplenishablesFromNPCs(bot: Type) {
        for (const [item, amount] of this.replenishables) {
            if (!bot.canBuy(item)) continue // We can't buy this item

            const num = bot.countItem(item)
            const numToBuy = Math.min(amount - num, Math.floor(bot.gold / AL.Game.G.items[item].g))
            if (numToBuy <= 0) continue // We don't want to buy any

            await bot.buy(item, numToBuy)
        }
    }
}