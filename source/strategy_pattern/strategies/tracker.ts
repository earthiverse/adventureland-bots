import AL, { Merchant } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class TrackerStrategy<Type extends Merchant> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor(options = { interval: 900_000 }) {
        // This strategy is only useful if we have a database connection, because the only reason we're calling
        // `tracker` is to update the database with achievement progress.
        if (!AL.Database.connection) return

        this.loops.set("tracker", {
            fn: async (bot: Type) => { await this.checkTracker(bot) },
            interval: options?.interval ?? 900_000
        })
    }

    private async checkTracker(bot: Type) {
        if ((bot.hasItem("tracker") || bot.hasItem("supercomputer")) && bot.cc < 100) {
            await bot.getTrackerData()
        }
    }
}