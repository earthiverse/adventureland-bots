import { Rogue } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

// TODO: Add options to toggle whether or not we should give to everyone, just friends, etc.

export class GiveRogueSpeedStrategy<Type extends Rogue> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("rspeed", {
            fn: async (bot: Type) => {
                await this.giveRogueSpeedToSelf(bot)
                await this.giveRogueSpeedToOthers(bot)
            },
            interval: ["rspeed"]
        })
    }

    private async giveRogueSpeedToSelf(bot: Type) {
        if (!bot.canUse("rspeed")) return
        if (bot.s.rspeed?.ms > 30_000) return // We have rogue speed already

        // Give rogue speed to ourself
        await bot.rspeed(bot.id).catch((e) => console.error(e))
    }

    private async giveRogueSpeedToOthers(bot: Type) {
        if (!bot.canUse("rspeed")) return

        for (const player of bot.getPlayers({
            isNPC: false,
            withinRange: "rspeed"
        })) {
            if (player.s.rspeed?.ms > 300_000) continue // Already has rogue speed

            // Give rogue speed to the player
            await bot.rspeed(player.id).catch((e) => console.error(e))
            break
        }
    }
}