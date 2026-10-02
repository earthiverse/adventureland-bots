import { describe, expect, it } from "bun:test"
import { EventBus } from "../../../../src/core/events/event_bus.js"
import { TeamBlackboard } from "../../../../src/core/blackboard/team_blackboard.js"
import type { ActionContext } from "../../../../src/core/actions/action.js"
import { createMockGData } from "../../../../src/test_support/g_data.mock.js"
import { MockCharacter } from "../../../../src/test_support/mock_character.js"
import { UsePotionAction } from "../../../../src/domain/combat/actions/shared/use_potion_action.js"
import { LootChestsAction } from "../../../../src/domain/combat/actions/shared/loot_chests_action.js"
import { BasicAttackAction } from "../../../../src/domain/combat/actions/shared/basic_attack_action.js"

describe("Shared Combat Actions", () => {
    const gData = createMockGData()

    function createTestContext() {
        const eventBus = new EventBus()
        const blackboard = new TeamBlackboard("US", "I", eventBus)
        const context: ActionContext = { blackboard, eventBus }
        return { eventBus, blackboard, context }
    }

    describe("UsePotionAction", () => {
        it("should not execute when HP and MP are both full", () => {
            const { context } = createTestContext()
            const action = new UsePotionAction()
            const bot = new MockCharacter({ hp: 1000, max_hp: 1000, mp: 500, max_mp: 500 })

            expect(action.canExecute(bot, context)).toBe(false)
            expect(action.score(bot, context)).toBe(0)
        })

        it("should prioritize HP restoration when HP is critically low with score > 95", async () => {
            const { context, eventBus } = createTestContext()
            const action = new UsePotionAction()
            const bot = new MockCharacter({ hp: 200, max_hp: 1000, mp: 500, max_mp: 500 })
            bot.items = [{ name: "hpot1", q: 10 }]

            let healthCriticalEmitted = false
            eventBus.subscribe("bot:health_critical", () => {
                healthCriticalEmitted = true
            })

            expect(action.canExecute(bot, context)).toBe(true)
            const score = action.score(bot, context)
            expect(score).toBeGreaterThan(95)

            const executed = await action.execute(bot, context)
            expect(executed).toBe(true)
            expect(bot.calls.some((c) => c.method === "usePotion" && c.args[0] === 0)).toBe(true)
            expect(healthCriticalEmitted).toBe(true)
        })

        it("should fall back to regenHP when out of potions", async () => {
            const { context } = createTestContext()
            const action = new UsePotionAction()
            const bot = new MockCharacter({ hp: 500, max_hp: 1000, mp: 500, max_mp: 500 })
            bot.items = [] // No potions

            expect(action.canExecute(bot, context)).toBe(true)
            const executed = await action.execute(bot, context)
            expect(executed).toBe(true)
            expect(bot.calls.some((c) => c.method === "regenHP")).toBe(true)
        })

        it("should use MP potion when MP is depleted and HP is full", async () => {
            const { context } = createTestContext()
            const action = new UsePotionAction()
            const bot = new MockCharacter({ hp: 1000, max_hp: 1000, mp: 50, max_mp: 500 })
            bot.items = [{ name: "mpot1", q: 5 }]

            expect(action.canExecute(bot, context)).toBe(true)
            expect(action.score(bot, context)).toBeGreaterThan(60)

            const executed = await action.execute(bot, context)
            expect(executed).toBe(true)
            expect(bot.calls.some((c) => c.method === "usePotion")).toBe(true)
        })
    })

    describe("LootChestsAction", () => {
        it("should not execute when there are no chests or inventory is full", () => {
            const { context } = createTestContext()
            const action = new LootChestsAction()

            const emptyBot = new MockCharacter({ esize: 10 })
            expect(action.canExecute(emptyBot, context)).toBe(false)

            const fullBot = new MockCharacter({ esize: 0 })
            fullBot.chests.set("chest_1", { id: "chest_1", x: 0, y: 0 })
            expect(action.canExecute(fullBot, context)).toBe(false)
        })

        it("should score and loot reachable chests", async () => {
            const { context } = createTestContext()
            const action = new LootChestsAction({ maxDistance: 400 })
            const bot = new MockCharacter({ x: 0, y: 0, esize: 15, hp: 1000, max_hp: 1000 })
            bot.chests.set("c1", { id: "c1", x: 50, y: 50 })
            bot.chests.set("c2", { id: "c2", x: 100, y: 100 })
            bot.chests.set("too_far", { id: "too_far", x: 900, y: 900 })

            expect(action.canExecute(bot, context)).toBe(true)
            expect(action.score(bot, context)).toBeGreaterThanOrEqual(55)

            const executed = await action.execute(bot, context)
            expect(executed).toBe(true)
            expect(bot.calls.filter((c) => c.method === "openChest").length).toBe(2)
        })

        it("should deprioritize looting when health is critical", () => {
            const { context } = createTestContext()
            const action = new LootChestsAction()
            const bot = new MockCharacter({ hp: 200, max_hp: 1000, esize: 10 })
            bot.chests.set("c1", { id: "c1", x: 10, y: 10 })

            expect(action.score(bot, context)).toBe(10)
        })
    })

    describe("BasicAttackAction", () => {
        it("should attack in-range targets selected by TargetSelector", async () => {
            const { context } = createTestContext()
            const action = new BasicAttackAction({ gData })
            const bot = new MockCharacter({ x: 0, y: 0, range: 60 })

            bot.entities.set("goo_1", {
                id: "goo_1",
                type: "goo",
                hp: 200,
                max_hp: 200,
                x: 30,
                y: 0,
            })

            expect(action.canExecute(bot, context)).toBe(true)
            const score = action.score(bot, context)
            expect(score).toBeGreaterThan(40)

            const executed = await action.execute(bot, context)
            expect(executed).toBe(true)
            expect(bot.calls.some((c) => c.method === "basicAttack" && c.args[0] === "goo_1")).toBe(true)
        })

        it("should not execute if target is beyond attack range", () => {
            const { context } = createTestContext()
            const action = new BasicAttackAction({ gData })
            const bot = new MockCharacter({ x: 0, y: 0, range: 40 })

            bot.entities.set("goo_far", {
                id: "goo_far",
                type: "goo",
                hp: 200,
                max_hp: 200,
                x: 100,
                y: 100, // Distance > 140
            })

            expect(action.canExecute(bot, context)).toBe(false)
        })

        it("should increase priority when enemy attacks a party member", () => {
            const { context } = createTestContext()
            const action = new BasicAttackAction({ gData })
            const bot = new MockCharacter({ name: "WarriorBot", x: 0, y: 0, range: 60 })

            bot.entities.set("threat_1", {
                id: "threat_1",
                type: "goo",
                hp: 200,
                max_hp: 200,
                x: 20,
                y: 0,
                target: "PriestBot", // Attacking teammate!
            })

            const score = action.score(bot, context)
            expect(score).toBeGreaterThanOrEqual(60) // 45 base + 15 target bonus
        })
    })
})

