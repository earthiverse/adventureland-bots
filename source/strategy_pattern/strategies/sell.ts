import AL, { Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"
import { DEFAULT_ITEM_CONFIG, ItemConfig, SellConfig, reduceCount, runSanityCheckOnItemConfig, wantToSellToNpc, wantToSellToPlayer } from "../../base/itemsNew.js"

export type SellStrategyOptions = {
    itemConfig: ItemConfig
}

const defaultNewSellStrategyOptions: SellStrategyOptions = {
    itemConfig: DEFAULT_ITEM_CONFIG
}

export class SellStrategy<Type extends Character> implements Strategy<Type> {
    protected options: SellStrategyOptions

    public loops = new Map<LoopName, Loop<Type>>()

    public constructor(options: SellStrategyOptions = defaultNewSellStrategyOptions) {
        this.options = options

        this.loops.set("sell", {
            fn: async (bot: Type) => {
                await this.sellToPlayers(bot)
                await this.sellToNPCs(bot)
            },
            interval: 1000
        })
    }

    public onApply(bot: Type) {
        // Ensure that we don't sell for less than we can get from an NPC
        runSanityCheckOnItemConfig(this.options.itemConfig).catch(console.error)
    }

    protected async sellToPlayers(bot: Type) {
        const players = bot.getPlayers({
            withinRange: AL.Constants.NPC_INTERACTION_DISTANCE
        })
        for (const player of players) {
            for (const [tradeSlot, wantedItem] of player.getWantedItems()) {
                if (!wantToSellToPlayer(this.options.itemConfig, wantedItem, bot)) continue // We don't want to sell it

                const ourItemIndex = bot.locateItem(
                    wantedItem.name,
                    bot.items,
                    { level: wantedItem.level, locked: false, special: false }
                )
                if (ourItemIndex === undefined) continue // We don't have any to sell
                const ourItem = bot.items[ourItemIndex]

                reduceCount(bot.owner, ourItem)

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
                reduceCount(bot.owner, ourItem)

                await bot.sellToMerchant(player.id, tradeSlot, wantedItem.rid, ourItem.q ? Math.min(numWeHave - config.sellExcess, ourItem.q) : 1).catch(console.error)
            }
        }
    }

    protected async sellToNPCs(bot: Type) {
        if (!bot.canSell()) return

        for (const [i, item] of bot.getItems()) {
            if (!wantToSellToNpc(this.options.itemConfig, item, bot)) continue // We don't want to sell

            reduceCount(bot.owner, item)

            await bot.sell(i, item.q ?? 1)
        }

        // Sell excess
        for (const [i, item] of bot.getItems()) {
            const config: SellConfig = this.options.itemConfig[item.name]
            if (!config) continue // Not in config
            if (config.sellExcess === undefined) continue // We don't want to sell
            const numWeHave = bot.countItem(item.name)
            if (numWeHave <= config.sellExcess) continue // We don't have an excess

            reduceCount(bot.owner, item)

            await bot.sell(i, item.q ? Math.min(numWeHave - config.sellExcess, item.q) : 1)
        }
    }
}