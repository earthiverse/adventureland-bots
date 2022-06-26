import { Rogue } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

// TODO: Add options to toggle whether or not we should give to everyone, just friends, etc.

export class GiveRogueSpeedStrategy<Type extends Rogue> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("rspeed", {
            fn: async (bot: Type) => {
                if (!bot.canUse("rspeed")) return
                await this.giveRogueSpeed(bot)
            },
            interval: ["rspeed"]
        })
    }

    private async giveRogueSpeed(bot: Type) {
        for (const player of bot.getPlayers({
            isNPC: false,
            withinRange: "rspeed"
        })) {
            if (player.s.rspeed?.ms > 300_000) continue // Already has rogue speed

            await bot.rspeed(player.id).catch((e) => console.error(e))
            break
        }
    }
}