import { describe, expect, it } from "bun:test"
import { EventBus } from "../../src/core/events/event_bus.js"

describe("EventBus", () => {
    it("should deliver published events to typed subscribers", () => {
        const bus = new EventBus()
        let received = 0
        let lastMonster = ""

        bus.subscribe("boss:spawned", (event) => {
            received++
            lastMonster = event.monster
        })

        bus.publish({
            type: "boss:spawned",
            monster: "franky",
            server: { region: "US", name: "I" },
            map: "level1",
        })

        expect(received).toBe(1)
        expect(lastMonster).toBe("franky")
    })

    it("should unsubscribe cleanly when the unsubscribe callback is invoked", () => {
        const bus = new EventBus()
        let callCount = 0

        const unsubscribe = bus.subscribe("party:member_joined", () => {
            callCount++
        })

        bus.publish({ type: "party:member_joined", botName: "Hero1", leaderName: "Leader" })
        expect(callCount).toBe(1)

        unsubscribe()

        bus.publish({ type: "party:member_joined", botName: "Hero2", leaderName: "Leader" })
        expect(callCount).toBe(1)
    })

    it("should notify wildcard subscribers for all domain events", () => {
        const bus = new EventBus()
        const receivedTypes: string[] = []

        bus.subscribeAll((event) => {
            receivedTypes.push(event.type)
        })

        bus.publish({ type: "server:hop_requested", targetRegion: "EU", targetIdentifier: "I", reason: "Boss" })
        bus.publish({ type: "supply:needed", botName: "Warrior", item: "hpot1", quantityNeeded: 500 })

        expect(receivedTypes).toEqual(["server:hop_requested", "supply:needed"])
    })

    it("should isolate handler errors so subsequent handlers still execute", () => {
        const bus = new EventBus()
        let secondHandlerRan = false

        bus.subscribe("bot:inventory_full", () => {
            throw new Error("Intentional subscriber crash")
        })

        bus.subscribe("bot:inventory_full", () => {
            secondHandlerRan = true
        })

        bus.publish({ type: "bot:inventory_full", botName: "Mage", freeSlots: 0 })

        expect(secondHandlerRan).toBe(true)
    })
})
