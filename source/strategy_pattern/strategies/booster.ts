import { Character, ItemName } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class BoosterStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected booster: ItemName

    public constructor(booster: ItemName) {
        this.booster = booster

        this.loops.set("booster", {
            fn: async (bot: Type) => {
                await this.buyBooster(bot).catch(console.error)
                this.activateBooster(bot)
            },
            interval: 1000,
        })
    }

    protected async buyBooster(bot: Type) {
        if (bot.rip) return
        if (bot.hasItem(this.booster)) return // We already have one
        if (!bot.canBuy(this.booster)) return // We can't buy it

        await bot.buy(this.booster)
    }

    protected activateBooster(bot: Type) {
        if (!bot.hasItem(this.booster)) return // No booster

        const boosterSlot = bot.locateItem(this.booster)
        const boosterItem = bot.items[boosterSlot]
        if (boosterItem.expires) return // Already activated

        // @ts-expect-error TODO: Add activate to ALClient
        bot.socket.emit("booster", { action: "activate", num: boosterSlot })
    }
}
