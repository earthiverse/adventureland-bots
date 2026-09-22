import AL, { Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"
import { suppress_errors } from "../logging.js"

export function canGetHolidaySpirit(bot: Character): boolean {
    return !!bot.S.holidayseason && !bot.s.holidayspirit
}

export class GetHolidaySpiritStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => {
                await this.getHolidaySpirit(bot)
            },
            interval: 100,
        })
    }

    private async getHolidaySpirit(bot: Type) {
        if (!canGetHolidaySpirit(bot)) return
        await bot
            .smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
            .catch(suppress_errors)
        await bot.smartMove("newyear_tree", {
            getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2,
            avoidTownWarps: true,
        })
        await bot.getHolidaySpirit()
    }
}
