import { Rogue } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class AlwaysInvisStrategy implements Strategy<Rogue> {
    public loops = new Map<LoopName, Loop<Rogue>>()

    public constructor() {
        this.loops.set("invis", {
            fn: async (bot: Rogue) => {
                await this.applyInvis(bot)
            },
            interval: ["invis"]
        })
    }

    private async applyInvis(bot: Rogue) {
        if (bot.s.invis) return // Already invisible
        if (!bot.canUse("invis")) return // Can't go invisible

        // Give rogue speed to ourself
        await bot.invis().catch(console.error)
    }
}