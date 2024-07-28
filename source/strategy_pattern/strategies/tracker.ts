import AL, { Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

const DEFAULT_INTERVAL = 900_000 // 15 minutes

export type TrackerStrategyOptions = {
    /** How often to call to update statistics in ms */
    interval: number
}

export class TrackerStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public constructor(options: TrackerStrategyOptions = { interval: DEFAULT_INTERVAL }) {
        this.loops.set("tracker", {
            fn: async (bot: Character) => {
                await this.checkTracker(bot)
            },
            interval: options?.interval ?? DEFAULT_INTERVAL,
        })
    }

    private async checkTracker(bot: Character, attemptNum = 1) {
        // This strategy is only useful if we have a database connection, because the only reason we're calling
        // `tracker` is to update the database with achievement progress.
        if (!AL.Database.connection) return

        if (!bot.hasItem(["tracker", "supercomputer"])) return // No tracker

        if (bot.cc > 100 && attemptNum < 5) {
            // We're at a high CC, wait a bit to avoid having the tracker disconnect us
            setTimeout(() => this.checkTracker(bot, attemptNum++), 10_000)
            return
        }

        await bot.getTrackerData()
    }
}
