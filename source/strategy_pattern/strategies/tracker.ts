import AL, { Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export type TrackerStrategyOptions = {
    /** How often to call to update statistics */
    interval: number
}

export class TrackerStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public constructor(options: TrackerStrategyOptions = { interval: 900_000 }) {
        this.loops.set("tracker", {
            fn: async (bot: Character) => { await this.checkTracker(bot) },
            interval: options?.interval ?? 900_000
        })
    }

    private async checkTracker(bot: Character) {
        // This strategy is only useful if we have a database connection, because the only reason we're calling
        // `tracker` is to update the database with achievement progress.
        if (!AL.Database.connection) return

        if (bot.hasItem(["tracker", "supercomputer"]) && bot.cc < 100) {
            await bot.getTrackerData()
        } else {
            console.debug(`[${bot.id}] Didn't check tracker!?`)
            console.debug(`[${bot.id}] tracker: ${bot.hasItem("tracker")}`)
            console.debug(`[${bot.id}] supercomputer: ${bot.hasItem("supercomputer")}`)
            console.debug(`[${bot.id}] bot.cc: ${bot.cc}`)
        }
    }
}