import AL, { Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class TrackerStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public constructor(options = { interval: 900_000 }) {
        // This strategy is only useful if we have a database connection, because the only reason we're calling
        // `tracker` is to update the database with achievement progress.
        if (!AL.Database.connection) return

        this.loops.set("tracker", {
            fn: async (bot: Character) => { await this.checkTracker(bot) },
            interval: options?.interval ?? 900_000
        })
    }

    private async checkTracker(bot: Character) {
        if ((bot.hasItem("tracker") || bot.hasItem("supercomputer")) && bot.cc < 100) {
            await bot.getTrackerData()
        }
    }
}