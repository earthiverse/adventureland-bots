import { Character, HitData } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"
import { suppress_errors } from "../logging.js"

/**
 * These are things that I have to workaround, but should probably be implemented in game
 */
export class FixStuffStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public grinchChecks = new Map<string, (data: HitData) => void>()

    public onApply(bot: Type): void {
        // Sometimes when Grinch warps, we don't see him right away and he attacks us for a bit
        // This fixes that so we request entity data if we see we have gold being stolen from us
        const grinchCheck = (data: HitData) => {
            if (data.goldsteal !== undefined) return // Not grinch
            if (bot.entities.has(data.hid)) return // Already see grinch
            if (bot.cc > 100) return // Too high CC
            bot.requestEntitiesData().catch(suppress_errors)
        }
        this.grinchChecks.set(bot.name, grinchCheck)
    }

    public onRemove(bot: Type): void {
        const listener = this.grinchChecks.get(bot.name)
        if (listener) {
            bot.socket.off("hit", listener)
            this.grinchChecks.delete(bot.name)
        }
    }
}
