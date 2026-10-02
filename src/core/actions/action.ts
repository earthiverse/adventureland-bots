import type { EventBus } from "../events/event_bus.js"
import type { TeamBlackboard } from "../blackboard/team_blackboard.js"

export interface ActionContext {
    blackboard: TeamBlackboard
    eventBus: EventBus
    signal?: AbortSignal
}

export interface Action<TBot = any> {
    name: string
    /**
     * Precondition check: is the action possible right now?
     * Checks cooldowns, mana, distance, and inventory without heavy calculations.
     */
    canExecute(bot: TBot, context: ActionContext): boolean

    /**
     * Utility scoring: computes a dynamic priority score from 0 to 100.
     * Actions with higher scores are prioritized. Returning <= 0 skips execution.
     */
    score(bot: TBot, context: ActionContext): number

    /**
     * Executes the action asynchronously.
     * Returns true/void if successful, false if it failed.
     */
    execute(bot: TBot, context: ActionContext): Promise<boolean | void>
}
