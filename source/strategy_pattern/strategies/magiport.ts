import AL, { Mage, PingCompensatedCharacter } from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "../context"

export class MagiportOthersSmartMovingToUsStrategyOptions {
    delayMs: number
    range: number
}

export const DefaultMagiportOthersSmartMovingToUsStrategyOptions: MagiportOthersSmartMovingToUsStrategyOptions = {
    /** Don't magiport the same bot within this interval (in ms) */
    delayMs: 5000,
    /** Offer magiports to those smart moving within this range of us */
    range: 250
}

export class MagiportOthersSmartMovingToUsStrategy implements Strategy<Mage> {
    public loops = new Map<LoopName, Loop<PingCompensatedCharacter>>()

    protected contexts: Strategist<PingCompensatedCharacter>[]
    protected options: MagiportOthersSmartMovingToUsStrategyOptions

    protected recentlyMagiported = new Map<string, number>()

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
            if (!AL.Pathfinder.canWalkPath(bot, friend.smartMoving)) continue // We can't walk to where they want to go
            if (AL.Tools.distance(friend, friend.smartMoving) < 2 * this.options.range) continue // They're fairly close
            if (AL.Tools.distance(bot, friend.smartMoving) > this.options.range) continue // They're not smart moving to a place near us

            const lastMagiport = this.recentlyMagiported.get(friend.id)
            if (lastMagiport && lastMagiport + this.options.delayMs > Date.now()) continue // We recently magiported them

            // Offer the magiport
            try {
                await bot.magiport(friend.id)
                this.recentlyMagiported.set(friend.id, Date.now())
                await friend.acceptMagiport(bot.id)
                await friend.stopSmartMove()
                await friend.stopWarpToTown()
            } catch (e) {
                console.error(e)
            }
        }
    }
}