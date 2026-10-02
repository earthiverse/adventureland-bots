import { describe, expect, it } from "bun:test"
import { EventBus } from "../../src/core/events/event_bus.js"
import { TeamBlackboard } from "../../src/core/blackboard/team_blackboard.js"

describe("TeamBlackboard", () => {
    it("should update and return team member statuses", () => {
        const bus = new EventBus()
        const board = new TeamBlackboard("US", "I", bus)

        board.updateMemberStatus({
            name: "Warrior1",
            type: "warrior",
            map: "main",
            x: 100,
            y: -50,
            hp: 800,
            maxHp: 1000,
            mp: 200,
            maxMp: 400,
            freeInventorySlots: 15,
            gold: 100000,
            isReady: true,
            isDead: false,
            lastUpdated: Date.now(),
        })

        const member = board.getMemberStatus("Warrior1")
        expect(member).toBeDefined()
        expect(member?.hp).toBe(800)
        expect(member?.map).toBe("main")
        expect(board.getAllMembers().length).toBe(1)

        board.removeMember("Warrior1")
        expect(board.getMemberStatus("Warrior1")).toBeUndefined()
    })

    it("should update active bosses automatically via EventBus events", () => {
        const bus = new EventBus()
        const board = new TeamBlackboard("US", "I", bus)

        bus.publish({
            type: "boss:spawned",
            monster: "franky",
            server: { region: "US", name: "I" },
            map: "level1",
            hp: 2000000,
            maxHp: 2000000,
        })

        const boss = board.getBoss("franky")
        expect(boss).toBeDefined()
        expect(boss?.monster).toBe("franky")
        expect(boss?.hp).toBe(2000000)

        bus.publish({
            type: "boss:defeated",
            monster: "franky",
            server: { region: "US", name: "I" },
        })

        expect(board.getBoss("franky")).toBeUndefined()
    })

    it("should track and fulfill supply requests", () => {
        const bus = new EventBus()
        const board = new TeamBlackboard("US", "I", bus)

        bus.publish({
            type: "supply:needed",
            botName: "Priest",
            item: "mpot1",
            quantityNeeded: 1000,
        })

        const needs = board.getSupplyNeeds()
        expect(needs.length).toBe(1)
        expect(needs[0].botName).toBe("Priest")
        expect(needs[0].item).toBe("mpot1")
        expect(needs[0].quantity).toBe(1000)

        board.fulfillSupplyNeed("Priest", "mpot1")
        expect(board.getSupplyNeeds().length).toBe(0)
    })
})
