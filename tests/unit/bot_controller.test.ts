import { describe, expect, it } from "bun:test"
import { BotController } from "../../src/core/character/bot_controller.js"
import { EventBus } from "../../src/core/events/event_bus.js"
import { TeamBlackboard } from "../../src/core/blackboard/team_blackboard.js"
import { MockCharacter } from "../../src/test_support/mock_character.js"

describe("BotController", () => {
    it("should sync character metrics to the TeamBlackboard upon start", () => {
        const eventBus = new EventBus()
        const blackboard = new TeamBlackboard("US", "I", eventBus)
        const mockBot = new MockCharacter({
            name: "EarthMage",
            ctype: "mage",
            map: "main",
            x: 25,
            y: 50,
            hp: 600,
            max_hp: 800,
            mp: 400,
            max_mp: 600,
            esize: 12,
            gold: 75000,
        })

        const controller = new BotController(mockBot.asPingCompensated(), {
            eventBus,
            blackboard,
            telemetryIntervalMs: 5000,
        })

        controller.start()

        const status = blackboard.getMemberStatus("EarthMage")
        expect(status).toBeDefined()
        expect(status?.name).toBe("EarthMage")
        expect(status?.type).toBe("mage")
        expect(status?.hp).toBe(600)
        expect(status?.maxHp).toBe(800)
        expect(status?.freeInventorySlots).toBe(12)

        controller.stop()
        expect(blackboard.getMemberStatus("EarthMage")).toBeUndefined()
    })

    it("should emit bot:health_critical event when HP drops below 25%", () => {
        const eventBus = new EventBus()
        const blackboard = new TeamBlackboard("US", "I", eventBus)
        const mockBot = new MockCharacter({
            name: "EarthPriest",
            ctype: "priest",
            hp: 200, // 20% of 1000
            max_hp: 1000,
        })

        let criticalReceived = false
        eventBus.subscribe("bot:health_critical", (e) => {
            if (e.botName === "EarthPriest") {
                criticalReceived = true
            }
        })

        const controller = new BotController(mockBot.asPingCompensated(), {
            eventBus,
            blackboard,
        })

        controller.syncTelemetry()

        expect(criticalReceived).toBe(true)
    })

    it("should emit bot:inventory_full event when free slots reach 0", () => {
        const eventBus = new EventBus()
        const blackboard = new TeamBlackboard("US", "I", eventBus)
        const mockBot = new MockCharacter({
            name: "EarthWarrior",
            ctype: "warrior",
            esize: 0,
        })

        let fullReceived = false
        eventBus.subscribe("bot:inventory_full", (e) => {
            if (e.botName === "EarthWarrior") {
                fullReceived = true
            }
        })

        const controller = new BotController(mockBot.asPingCompensated(), {
            eventBus,
            blackboard,
        })

        controller.syncTelemetry()

        expect(fullReceived).toBe(true)
    })
})
