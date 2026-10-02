import { describe, expect, it } from "bun:test"
import { EventBus } from "../../../src/core/events/event_bus.js"
import { TeamBlackboard } from "../../../src/core/blackboard/team_blackboard.js"
import { createMockGData } from "../../../src/test_support/g_data.mock.js"
import { CourierService } from "../../../src/domain/economy/courier_service.js"

describe("CourierService", () => {
    const gData = createMockGData()

    function setupBlackboard() {
        const eventBus = new EventBus()
        const blackboard = new TeamBlackboard("US", "I", eventBus)
        return { eventBus, blackboard }
    }

    describe("evaluateSupplyDeliveries", () => {
        it("should calculate exact shortfall and cost to buy missing supplies", () => {
            const { blackboard, eventBus } = setupBlackboard()
            const courier = new CourierService()

            // Bot requests 400 mpot1 and 200 hpot1
            eventBus.publish({
                type: "supply:needed",
                botName: "WarriorBot",
                item: "mpot1",
                quantityNeeded: 400,
            })
            eventBus.publish({
                type: "supply:needed",
                botName: "PriestBot",
                item: "hpot1",
                quantityNeeded: 200,
            })

            // Merchant already has 100 mpot1 on hand, but 0 hpot1
            const merchantInventory = [{ name: "mpot1", q: 100 }]
            const merchantGold = 100_000

            const plan = courier.evaluateSupplyDeliveries(blackboard, merchantInventory, merchantGold, gData)

            // Deliveries are grouped per bot
            expect(plan.deliveries.get("WarriorBot")).toEqual([{ item: "mpot1", quantity: 400 }])
            expect(plan.deliveries.get("PriestBot")).toEqual([{ item: "hpot1", quantity: 200 }])

            // Items to buy: 300 mpot1 (400 - 100 stock) and 200 hpot1
            const mpotBuy = plan.itemsToBuy.find((i) => i.item === "mpot1")
            const hpotBuy = plan.itemsToBuy.find((i) => i.item === "hpot1")

            expect(mpotBuy?.quantity).toBe(300)
            expect(mpotBuy?.cost).toBe(300 * 100) // 100g per mpot1

            expect(hpotBuy?.quantity).toBe(200)
            expect(hpotBuy?.cost).toBe(200 * 100) // 100g per hpot1

            expect(plan.totalCost).toBe(50_000)
            expect(plan.canAfford).toBe(true) // Merchant has 100k
        })

        it("should flag canAfford as false when merchant has insufficient gold", () => {
            const { blackboard, eventBus } = setupBlackboard()
            const courier = new CourierService()

            eventBus.publish({
                type: "supply:needed",
                botName: "MageBot",
                item: "mpot1",
                quantityNeeded: 1000, // 1000 * 100 = 100,000g
            })

            const plan = courier.evaluateSupplyDeliveries(blackboard, [], 10_000, gData)
            expect(plan.totalCost).toBe(100_000)
            expect(plan.canAfford).toBe(false) // Merchant only has 10k
        })
    })

    describe("evaluateLootCollections", () => {
        it("should detect party members with nearly full inventory (<= 3 free slots) and excess gold", () => {
            const { blackboard } = setupBlackboard()
            const courier = new CourierService({ lootCollectionFreeSlotsThreshold: 3, combatBotGoldToHold: 50_000 })

            // Warrior with full bags (0 free slots) -> Critical
            blackboard.updateMemberStatus({
                name: "WarriorTank",
                type: "warrior",
                map: "main",
                x: 100,
                y: 100,
                hp: 1000,
                maxHp: 1000,
                mp: 500,
                maxMp: 500,
                freeInventorySlots: 0,
                gold: 250_000, // 200k excess
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            // Ranger with 2 free slots -> High
            blackboard.updateMemberStatus({
                name: "RangerDps",
                type: "ranger",
                map: "winterland",
                x: 0,
                y: 0,
                hp: 800,
                maxHp: 800,
                mp: 400,
                maxMp: 400,
                freeInventorySlots: 2,
                gold: 60_000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            // Priest with plenty of space -> Should not be flagged
            blackboard.updateMemberStatus({
                name: "PriestHealer",
                type: "priest",
                map: "main",
                x: 200,
                y: 200,
                hp: 900,
                maxHp: 900,
                mp: 600,
                maxMp: 600,
                freeInventorySlots: 25,
                gold: 20_000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            const candidates = courier.evaluateLootCollections(blackboard, 20)
            expect(candidates.length).toBe(2)

            // Critical candidate (Warrior) should be sorted first
            expect(candidates[0].botName).toBe("WarriorTank")
            expect(candidates[0].urgency).toBe("critical")
            expect(candidates[0].excessGold).toBe(200_000)

            expect(candidates[1].botName).toBe("RangerDps")
            expect(candidates[1].urgency).toBe("high")
        })

        it("should return empty if merchant has zero free inventory space", () => {
            const { blackboard } = setupBlackboard()
            const courier = new CourierService()

            blackboard.updateMemberStatus({
                name: "WarriorTank",
                type: "warrior",
                map: "main",
                x: 0,
                y: 0,
                hp: 1000,
                maxHp: 1000,
                mp: 500,
                maxMp: 500,
                freeInventorySlots: 0,
                gold: 100_000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            const candidates = courier.evaluateLootCollections(blackboard, 0) // Merchant is full
            expect(candidates.length).toBe(0)
        })
    })

    describe("planCourierTrip", () => {
        it("should combine deliveries and loot collection into unified ordered waypoints", () => {
            const { blackboard, eventBus } = setupBlackboard()
            const courier = new CourierService()

            // Warrior needs potions AND has full bags
            blackboard.updateMemberStatus({
                name: "WarriorTank",
                type: "warrior",
                map: "main",
                x: 100,
                y: 200,
                hp: 1000,
                maxHp: 1000,
                mp: 500,
                maxMp: 500,
                freeInventorySlots: 0, // Critical
                gold: 150_000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            eventBus.publish({
                type: "supply:needed",
                botName: "WarriorTank",
                item: "hpot1",
                quantityNeeded: 200,
            })

            const waypoints = courier.planCourierTrip(blackboard, [], 500_000, 20, gData)

            expect(waypoints.length).toBe(1)
            const stop = waypoints[0]
            expect(stop.botName).toBe("WarriorTank")
            expect(stop.map).toBe("main")
            expect(stop.x).toBe(100)
            expect(stop.y).toBe(200)
            expect(stop.deliveries).toEqual([{ item: "hpot1", quantity: 200 }])
            expect(stop.collectLoot).toBe(true)
            expect(stop.excessGoldToCollect).toBe(100_000)
            expect(stop.urgency).toBe("critical")
        })
    })
})
