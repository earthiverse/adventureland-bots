import AL, { GMap, ItemName, MapName, Character, TradeSlotType, IPosition, ItemDataTrade } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export type BuyStrategyOptions = {
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

export class BuyStrategy<Type extends Character> implements BuyStrategyOptions, Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public buyForProfit = false
    public buyMap: Map<ItemName, number>
    public replenishables: Map<ItemName, number>

    public lastPontyCheck: Date
    public pontyLocations: IPosition[]
    public pontyItems: ItemDataTrade[]

    public setOnSecondhands: (data: ItemDataTrade[]) => void

    public constructor(options: BuyStrategyOptions = RecommendedBuyStrategyOptions) {
        if (options.buyMap) this.buyMap = options.buyMap
        if (options.replenishables) this.replenishables = options.replenishables
        if (options.enableBuyForProfit) this.buyForProfit = true

        this.pontyLocations = AL.Pathfinder.locateNPC("secondhands")

        for (const [itemName, buyFor] of this.buyMap ?? []) {
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
                if (buyFor === undefined) {
                    // We didn't specify a price, set it to the price from G (no markup)
                    this.buyMap[itemName] = gItem.g
                } else if (buyFor > gPrice) {
                    console.warn(`Lowering buy price for ${itemName} to ${gPrice} to match the price the NPC sells this item for.`)
                    this.buyMap[itemName] = gPrice
                }
            } else if (!buyFor) {
                // Pay up to G for it
                this.buyMap[itemName] = gItem.g
            }
        }

        this.loops.set("buy", {
            fn: async (bot: Type) => { await this.buy(bot) },
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
        if (this.replenishables) {
            await this.buyReplenishablesFromMerchants(bot)
            await this.buyReplenishablesFromNPCs(bot)
        }
        if (this.buyMap) {
            await this.buyFromPonty(bot)
            await this.buyFromMerchants(bot)
        }
        if (this.buyForProfit) await this.buyFromMerchantsForProfit(bot)
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
            const willingToPay = this.buyMap.get(pontyItem.name)
            if (willingToPay === undefined) continue // We don't want it

            const pontyPrice = AL.Game.G.items[pontyItem.name].g * AL.Constants.PONTY_MARKUP // TODO: Use AL.Game.G.multipliers.secondhands_mult if it ever gets fixed
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

                const willingToPay = this.buyMap.get(item.name)
                if (willingToPay === undefined) continue // We don't want it
                if (item.price > willingToPay) continue // They're selling it for more than it's worth

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