import AL, { Character, ItemName, Merchant } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"
import { DEFAULT_ITEM_CONFIG, ItemConfig, reduceCount } from "../../base/itemsNew.js"

export type DestroyStrategyOptions = {
    itemConfig: ItemConfig
}

export const defaultNewDestroyStrategyOptions: DestroyStrategyOptions = {
    itemConfig: DEFAULT_ITEM_CONFIG
}

/**
 * NOTE: Don't run this on merchants, they require more complicated logic
 *       due to the fact that they should craft rods and pickaxes, too
 */
export class DestroyStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public options: DestroyStrategyOptions

    public constructor(options: DestroyStrategyOptions = defaultNewDestroyStrategyOptions) {
        this.options = options

        this.loops.set("destroy", {
            fn: async (bot: Type) => {
                await this.destroy(bot)
            },
            interval: 1000,
        })
    }

    protected async destroy(bot: Type) {
        const destroyPromises = []
        for (const [slot, item] of bot.getItems()) {
            const config = this.options.itemConfig[item.name]
            if (!config) continue // No config -> don't destroy
            if (config.destroyBelowLevel === undefined) continue // Don't want to destroy
            if (item.level >= config.destroyBelowLevel) continue // The item is too high level

            reduceCount(bot.owner, item)
            destroyPromises.push(bot.destroy(slot))
        }
        await Promise.allSettled(destroyPromises)
    }
}

/**
 * Has additional logic to not destroy items we need to craft items with
 */
export class MerchantDestroyStrategy extends DestroyStrategy<Merchant> {
    protected async destroy(bot: Merchant): Promise<void> {
        const destroyPromises = []

        destroySearch:
        for (let [slot, item] of bot.getItems()) {
            const config = this.options.itemConfig[item.name]
            if (!config) continue // No config -> don't destroy
            if (config.destroyBelowLevel === undefined) continue // Don't want to destroy
            if (config.destroyBelowLevel <= item.level) continue // The item is too high level

            for (const craftableItem of (["pickaxe", "rod"] as ItemName[])) {
                if (bot.hasItem(craftableItem)) continue // We have the item in our inventory
                if (bot.isEquipped(craftableItem)) continue // We have the item equipped
                if (!AL.Game.G.craft[craftableItem].items.some(i => i[1] === item.name)) continue // This item isn't needed to craft it

                continue destroySearch // We need the item to craft
            }

            reduceCount(bot.owner, item)
            destroyPromises.push(bot.destroy(slot))
        }
        await Promise.allSettled(destroyPromises)
    }
}