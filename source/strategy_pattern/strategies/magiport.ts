import AL, { Mage, PingCompensatedCharacter } from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "../context"

export class MagiportOthersSmartMovingToUsStrategyOptions {
    range: number
}

export const DefaultMagiportOthersSmartMovingToUsStrategyOptions: MagiportOthersSmartMovingToUsStrategyOptions = {
    range: 100
}

export class MagiportOthersSmartMovingToUsStrategy implements Strategy<Mage> {
    public loops = new Map<LoopName, Loop<PingCompensatedCharacter>>()

    protected contexts: Strategist<PingCompensatedCharacter>[]
    protected options: MagiportOthersSmartMovingToUsStrategyOptions

    public constructor(contexts: Strategist<PingCompensatedCharacter>[], options = DefaultMagiportOthersSmartMovingToUsStrategyOptions) {
        this.contexts = contexts
        this.options = options

        this.loops.set("magiport", {
            fn: async (bot: Mage) => { await this.magiport(bot) },
            interval: ["magiport"]
        })
    }

    protected async magiport(bot: Mage) {
        if (!bot.canUse("magiport")) return // We can't magiport anyone
        if (bot.smartMoving) return // We're currently moving somewhere

        for (const context of this.contexts) {
            if (!context.isReady()) continue
            const friend = context.bot
            if (friend.id == bot.id) continue // It's us
            if (!friend.smartMoving) continue // They're not smart moving
            if (AL.Pathfinder.canWalkPath(bot, friend)) continue // They can walk to us
            if (AL.Tools.distance(bot, friend.smartMoving) > this.options.range) continue // They're not smart moving to a place near us

            // Offer the magiport
            try {
                await bot.magiport(friend.id)
                return friend.acceptMagiport(bot.id)
            } catch (e) {
                console.error(e)
            }
        }
    }
}