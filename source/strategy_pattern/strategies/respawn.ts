import { Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class RespawnStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("respawn", {
            fn: async (bot: Type) => { await this.respawnIfDead(bot) },
            interval: 1000
        })
    }

    private async respawnIfDead(bot: Type) {
        if (!bot.rip) return

        await bot.respawn().catch(console.error)
    }
}