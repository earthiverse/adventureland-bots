import { PingCompensatedCharacter, Priest } from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "../context.js"

export type PartyHealStrategyOptions = {
    /** When to heal */
    healWhenLessThan: {
        /**
         * Heal when a context's bot goes below this hp value.
         *
         * NOTE: If there is a context with max_hp lower than this, we will spend all of our mp party healing...
         */
        hp?: number
        /** Heal when a context's bot is missing more than this amount of hp */
        hpMissing?: number
        /** Heal when a context's bot goes below the ratio `bot.hp / bot.max_hp` */
        hpRatio?: number
    }
}

export const DEFAULT_PARTY_HEAL_STRATEGY_OPTIONS: PartyHealStrategyOptions = {
    healWhenLessThan: {
        hpRatio: 0.5
    }
}

export class PartyHealStrategy implements Strategy<Priest> {
    public loops = new Map<LoopName, Loop<Priest>>()

    protected contexts: Strategist<PingCompensatedCharacter>[]
    protected options: PartyHealStrategyOptions

    public constructor(contexts: Strategist<PingCompensatedCharacter>[], options = DEFAULT_PARTY_HEAL_STRATEGY_OPTIONS) {
        this.contexts = contexts

        if (options.healWhenLessThan.hpRatio === undefined && options.healWhenLessThan.hp === undefined) {
            throw new Error("Please set one of the parameters in `healWhenLessThan`.")
        }
        this.options = options

        this.loops.set("partyheal", {
            fn: async (bot: Priest) => { await this.partyHeal(bot) },
            interval: ["partyheal"]
        })
    }

    private async partyHeal(bot: Priest) {
        if (bot.rip) return
        if (!bot.canUse("partyheal")) return
        if (!bot.party) return // Not in a party

        for (const context of this.contexts) {
            if (!context.isReady()) continue
            const friend = context.bot
            if (!friend || !friend.ready || friend.socket.disconnected || friend.rip) continue
            if (friend.party !== bot.party) continue // They're in a different party

            if (
                (this.options.healWhenLessThan.hp !== undefined && friend.hp < this.options.healWhenLessThan.hp)
                || (this.options.healWhenLessThan.hpRatio !== undefined && (friend.hp / friend.max_hp) < this.options.healWhenLessThan.hpRatio)
                || (this.options.healWhenLessThan.hpMissing !== undefined && (friend.max_hp - friend.hp > this.options.healWhenLessThan.hpMissing))
            ) {
                return bot.partyHeal().catch(console.error)
            }
        }
    }
}