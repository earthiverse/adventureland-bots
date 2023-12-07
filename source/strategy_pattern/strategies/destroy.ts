import AL, { ItemName, Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export type DestroyStrategyOptions = {
    /**
     * Destroy these items if they are level 0
     *
     * There's a 1/1,000,000 chance for the item to become level 13
     */
    destroy: Set<ItemName>
}

export class DestroyStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public options: DestroyStrategyOptions

    public constructor(options: DestroyStrategyOptions) {
        this.options = options

        this.loops.set("destroy", {
            fn: async (bot: Type) => {
                await this.destroy(bot)
            },
            interval: 1000,
        })
    }

    private async destroy(bot: Type) {
        for (let i = 0; i < bot.isize; i++) {
            const item = bot.items[i]
            if (!item) continue
            if (item.level !== 0) continue
            if (!this.options.destroy.has(item.name)) continue

            if (bot.ctype === "merchant") {
                // Prevent destroying items needed to craft rod or pickaxe if we don't have one
                if (!bot.hasItem("rod") && !bot.isEquipped("rod")) {
                    if (AL.Game.G.craft.rod.items.some((a) => a[1] === item.name)) continue
                }
                if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe")) {
                    if (AL.Game.G.craft.pickaxe.items.some((a) => a[1] === item.name)) continue
                }
            }

            // @ts-ignore TODO: Move to ALClient
            bot.socket.emit("destroy", { num: i, q: 1, statue: true })
        }
    }
}