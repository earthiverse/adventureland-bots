import { describe, expect, it } from "bun:test"
import { ActionRunner } from "../../src/core/actions/action_runner.js"
import type { Action, ActionContext } from "../../src/core/actions/action.js"
import { EventBus } from "../../src/core/events/event_bus.js"
import { TeamBlackboard } from "../../src/core/blackboard/team_blackboard.js"
import { MockCharacter } from "../../src/test_support/mock_character.js"

describe("ActionRunner", () => {
    const makeContext = (): ActionContext => {
        const eventBus = new EventBus()
        return {
            blackboard: new TeamBlackboard("US", "I", eventBus),
            eventBus,
        }
    }

    it("should select and execute the highest-scoring eligible action", async () => {
        const runner = new ActionRunner()
        const bot = new MockCharacter()
        const context = makeContext()
        const executed: string[] = []

        const lowPriorityAction: Action = {
            name: "basic_attack",
            canExecute: () => true,
            score: () => 20,
            execute: async () => {
                executed.push("basic_attack")
            },
        }

        const highPriorityAction: Action = {
            name: "emergency_heal",
            canExecute: () => true,
            score: () => 90,
            execute: async () => {
                executed.push("emergency_heal")
            },
        }

        runner.register(lowPriorityAction).register(highPriorityAction)

        const ranAction = await runner.tick(bot, context)

        expect(ranAction).toBe("emergency_heal")
        expect(executed).toEqual(["emergency_heal"])
    })

    it("should skip actions whose canExecute returns false even if score is high", async () => {
        const runner = new ActionRunner()
        const bot = new MockCharacter()
        const context = makeContext()
        const executed: string[] = []

        const unavailableAction: Action = {
            name: "burst",
            canExecute: () => false, // on cooldown or insufficient MP
            score: () => 95,
            execute: async () => {
                executed.push("burst")
            },
        }

        const fallbackAction: Action = {
            name: "basic_attack",
            canExecute: () => true,
            score: () => 15,
            execute: async () => {
                executed.push("basic_attack")
            },
        }

        runner.register(unavailableAction).register(fallbackAction)

        const ranAction = await runner.tick(bot, context)

        expect(ranAction).toBe("basic_attack")
        expect(executed).toEqual(["basic_attack"])
    })

    it("should not execute any action if all scores are <= minScore", async () => {
        const runner = new ActionRunner({ minScore: 10 })
        const bot = new MockCharacter()
        const context = makeContext()

        const trivialAction: Action = {
            name: "trivial",
            canExecute: () => true,
            score: () => 5, // Below minScore
            execute: async () => {},
        }

        runner.register(trivialAction)

        const ranAction = await runner.tick(bot, context)
        expect(ranAction).toBeNull()
    })
})
