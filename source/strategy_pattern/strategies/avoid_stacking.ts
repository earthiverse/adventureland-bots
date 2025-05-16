import { Character, HitData } from "alclient"
import { Strategy } from "../context.js"
import { suppress_errors } from "../logging.js"

export class AvoidStackingStrategy<Type extends Character> implements Strategy<Type> {
    // public loops = new Map<LoopName, Loop<Type>>()
    private onHit: (data: HitData) => Promise<void>

    private lastMove = new Map<Type, number>()

    public constructor() {
        // this.loops.set("avoid_stacking", {
        //     fn: async (bot: Type) => {
        //         await this.checkStacking(bot)
        //     },
        //     interval: 250,
        // })
    }

    // private async checkStacking(bot: Type) {
    //     if (bot.moving || bot.smartMoving) return // We're moving, don't check stacking

    //     for(const other of bot.getPlayers({ withinRange: 0 })) {

    //     }
    //     // TODO: Check if we're on top of another player. If we are, find an empty spot to move to.
    // }

    public onApply(bot: Type) {
        this.onHit = async (data: HitData) => {
            if (data.id !== bot.id) return // Not for us
            if (!data.stacked) return
            if (bot.moving || bot.smartMoving) return // We're moving, don't check stacking
            if (this.lastMove.has(bot) && this.lastMove.get(bot) >= Date.now() - 250) return // We recently moved
            if (!data.stacked.includes(bot.id)) return // We're not the ones that are stacked

            console.info(`Moving ${bot.id} to avoid stacking!`)

            const x = -25 + Math.round(50 * Math.random())
            const y = -25 + Math.round(50 * Math.random())

            this.lastMove.set(bot, Date.now())

            await bot.move(bot.x + x, bot.y + y).catch(suppress_errors)
        }

        bot.socket.on("hit", this.onHit)
    }

    public onRemove(bot: Type) {
        if (this.onHit) bot.socket.removeListener("hit", this.onHit)
    }
}
