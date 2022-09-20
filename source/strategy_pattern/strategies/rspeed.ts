import AL, { Rogue } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

// TODO: Add options to toggle whether or not we should give to everyone, just friends, etc.

export class GiveRogueSpeedStrategy implements Strategy<Rogue> {
    public loops = new Map<LoopName, Loop<Rogue>>()

    public constructor() {
        this.loops.set("rspeed", {
            fn: async (bot: Rogue) => {
                await this.giveRogueSpeedToSelf(bot)
                await this.giveRogueSpeedToOthers(bot)
            },
            interval: ["rspeed"]
        })
    }

    private async giveRogueSpeedToSelf(bot: Rogue) {
        if (!bot.canUse("rspeed")) return
        if (bot.s.rspeed?.ms > 30_000) return // We have rogue speed already

        // Give rogue speed to ourself
        await bot.rspeed(bot.id).catch(console.error)
    }

    private async giveRogueSpeedToOthers(bot: Rogue) {
        if (!bot.canUse("rspeed")) return

        for (const player of bot.getPlayers({
            isNPC: false,
            withinRange: "rspeed"
        })) {
            if (player.s.rspeed?.ms > 300_000) continue // Already has rogue speed

            // Give rogue speed to the player
            await bot.rspeed(player.id).catch(console.error)
            await AL.PlayerModel.updateOne({ name: player.id }, { s: player.s }).catch(console.error)
            break
        }
    }
}