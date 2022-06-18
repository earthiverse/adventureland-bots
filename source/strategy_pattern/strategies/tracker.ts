import { Merchant } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class TrackerStrategy<Type extends Merchant> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor(options = { interval: 900_000 }) {
        this.loops.set("merchant_stand", {
            fn: async (bot: Type) => { await this.checkTracker(bot) },
            interval: options?.interval ?? 900_000
        })
    }

    async checkTracker(bot: Type) {
        if ((bot.hasItem("tracker") || bot.hasItem("supercomputer")) && bot.cc < 100) {
            await bot.getTrackerData()
        }
    }
}