import { PingCompensatedCharacter } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class RespawnStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("respawn", {
            fn: async (bot: Type) => { await this.respawnIfDead(bot) },
            interval: 1000
        })
    }

    private async respawnIfDead(bot: Type) {
        if (!bot.rip) return

        await bot.respawn().catch((e) => console.error(e))
    }
}