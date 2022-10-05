import { Character, HitData } from "alclient"
import { /* Loop, LoopName, */ Strategy } from "../context.js"

export class AvoidStackingStrategy<Type extends Character> implements Strategy<Type> {
    // public loops = new Map<LoopName, Loop<Type>>()
    private onHit: (data: HitData) => Promise<void>

    public constructor() {
        // this.loops.set("avoid_stacking", {
        //     fn: async (bot: Type) => { await this.checkStacking(bot) },
        //     interval: 250
        // })
    }

    // private async checkStacking(bot: Type) {
    //     if (bot.moving || bot.smartMoving) return // We're moving, don't check stacking

    //     // TODO: Check if we're on top of another player. If we are, find an empty spot to move to.
    // }

    public onApply(bot: Type) {
        this.onHit = async (data: HitData) => {
            if (data.id !== bot.id) return // Not for us
            if (!data.stacked) return
            if (!data.stacked.includes(bot.id)) return // We're not the ones that are stacked

            console.info(`Moving ${bot.id} to avoid stacking!`)

            const x = -25 + Math.round(50 * Math.random())
            const y = -25 + Math.round(50 * Math.random())
            await bot.move(bot.x + x, bot.y + y).catch(() => { /* Suppress errors */ })
        }

        bot.socket.on("hit", this.onHit)
    }

    public onRemove(bot: Type) {
        if (this.onHit) bot.socket.removeListener("hit", this.onHit)
    }
}