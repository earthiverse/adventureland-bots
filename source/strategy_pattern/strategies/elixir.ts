import { Character, ItemName } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class ElixirStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected elixir: ItemName

    public constructor(elixir: ItemName) {
        this.elixir = elixir

        this.loops.set("elixir", {
            fn: async (bot: Type) => {
                await this.applyElixir(bot).catch(console.error)
            },
            interval: 1000,
        })
    }

    protected async applyElixir(bot: Type) {
        if (bot.rip) return
        if (bot.slots.elixir?.name === this.elixir) return // We have the correct elixir already

        try {
            if (!bot.hasItem(this.elixir)) {
                // Buy an elixir if we can
                if (!bot.canBuy(this.elixir)) return
                await bot.buy(this.elixir)
            }

            if (bot.hasItem(this.elixir)) {
                // Use the elixir
                await bot.equip(bot.locateItem(this.elixir))
            }
        } catch (e) {
            console.error(e)
        }
    }
}
