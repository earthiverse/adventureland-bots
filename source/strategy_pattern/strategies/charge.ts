import { Warrior } from "alclient"
import { Strategy, LoopName, Loop } from "../context.js"

export class ChargeStrategy implements Strategy<Warrior> {
    public loops = new Map<LoopName, Loop<Warrior>>()

    public constructor() {
        this.loops.set("charge", {
            fn: async (bot: Warrior) => { await this.applyCharge(bot) },
            interval: 1000
        })
    }

    protected async applyCharge(bot: Warrior) {
        if (bot.rip) return
        if (!bot.moving && !bot.smartMoving) return // Not moving
        if (!bot.canUse("charge")) return

        // Apply charge
        return bot.charge()
    }
}