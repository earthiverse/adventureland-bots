import { beforeEach, describe, expect, it } from "bun:test"
import { createMockGData } from "../../../src/test_support/g_data.mock.js"
import { MockCharacter } from "../../../src/test_support/mock_character.js"
import { TeamBlackboard } from "../../../src/core/blackboard/team_blackboard.js"
import { EventBus } from "../../../src/core/events/event_bus.js"
import type { ItemCatalog } from "../../../src/domain/items/item_schema.js"
import {
    evaluatePontyPurchases,
    evaluateStandListings,
    evaluateStandState,
    MerchantTradeService,
} from "../../../src/domain/economy/merchant_trade_service.js"
import { MerchantTradeAction } from "../../../src/domain/economy/merchant_trade_action.js"

describe("Merchant Trade Service & Stand Automation", () => {
    const mockGData = createMockGData()

    // Sample test catalog with various buy/sell/list policies
    const testCatalog: ItemCatalog = {
        scroll0: {
            hold: ["merchant"],
            replenish: 50,
            buy: true,
            buyPrice: "ponty",
        },
        ringsj: {
            buy: true,
            buyPrice: "ponty",
            compoundUntilLevel: 2,
        },
        sword: {
            sell: true,
            list: true,
            sellPrice: 3000,
        },
        pants: {
            sell: true,
            list: true,
            sellPrice: "npc",
        },
        coat: {
            sell: true,
            list: true,
            sellPrice: { 0: 5000, 1: 10000 },
        },
        hpbelt: {
            hold: true, // Should never be listed
            list: true,
        },
        seashell: {
            sell: true,
            // list not set (false), should not be listed on stand
        },
    }

    describe("evaluatePontyPurchases (Pure)", () => {
        it("should approve ponty purchases when policy allows and gold exceeds reserve", () => {
            const pontyItems = [
                { name: "ringsj", level: 0, q: 1 },
                { name: "scroll0", level: 0, q: 10 },
            ]
            const inventory = [null, null, null] // 3 empty slots
            const currentGold = 500_000 // 500k gold

            const result = evaluatePontyPurchases(
                pontyItems,
                inventory,
                currentGold,
                testCatalog,
                mockGData,
                { minGoldReserve: 100_000 },
            )

            expect(result.itemsToBuy.length).toBe(2)
            expect(result.itemsToBuy[0].item.name).toBe("ringsj")
            expect(result.itemsToBuy[1].item.name).toBe("scroll0")
            expect(result.totalCost).toBeGreaterThan(0)
            expect(result.remainingGold).toBe(currentGold - result.totalCost)
            expect(result.remainingGold).toBeGreaterThanOrEqual(100_000)
            expect(result.skippedDueToReserve.length).toBe(0)
            expect(result.skippedDueToSpace.length).toBe(0)
        })

        it("should ignore buy orders placed by other players on Ponty", () => {
            const pontyItems = [
                { name: "ringsj", level: 0, q: 1, b: true }, // b: true indicates someone else's buy request
            ]
            const inventory = [null]

            const result = evaluatePontyPurchases(
                pontyItems,
                inventory,
                500_000,
                testCatalog,
                mockGData,
            )

            expect(result.itemsToBuy.length).toBe(0)
        })

        it("should skip items when purchase would breach the minimum gold reserve", () => {
            const pontyItems = [
                { name: "ringsj", level: 0, q: 1, price: 60_000 },
            ]
            const inventory = [null, null]
            const currentGold = 120_000 // 120k gold - 60k = 60k < 100k reserve

            const result = evaluatePontyPurchases(
                pontyItems,
                inventory,
                currentGold,
                testCatalog,
                mockGData,
                { minGoldReserve: 100_000 },
            )

            expect(result.itemsToBuy.length).toBe(0)
            expect(result.skippedDueToReserve.length).toBe(1)
            expect(result.skippedDueToReserve[0].item.name).toBe("ringsj")
            expect(result.remainingGold).toBe(currentGold)
        })

        it("should skip items when inventory is full and item cannot stack", () => {
            const pontyItems = [
                { name: "ringsj", level: 0, q: 1 },
            ]
            // Inventory full of swords (non-stackable)
            const inventory = [
                { name: "sword", level: 0 },
                { name: "pants", level: 0 },
            ]

            const result = evaluatePontyPurchases(
                pontyItems,
                inventory,
                1_000_000,
                testCatalog,
                mockGData,
                { minGoldReserve: 50_000 },
            )

            expect(result.itemsToBuy.length).toBe(0)
            expect(result.skippedDueToSpace.length).toBe(1)
            expect(result.skippedDueToSpace[0].item.name).toBe("ringsj")
        })

        it("should allow buying stackable items when inventory is full but existing stack has capacity", () => {
            // Suppose mpot1 stack size is 9999
            const customGData = createMockGData()
            customGData.items.scroll0.s = 1000

            const pontyItems = [
                { name: "scroll0", level: 0, q: 10 },
            ]
            // Inventory has 0 null slots, but has scroll0 with quantity 50
            const inventory = [
                { name: "scroll0", q: 50 },
                { name: "sword", level: 0 },
            ]

            const result = evaluatePontyPurchases(
                pontyItems,
                inventory,
                1_000_000,
                testCatalog,
                customGData,
                { minGoldReserve: 50_000 },
            )

            expect(result.itemsToBuy.length).toBe(1)
            expect(result.itemsToBuy[0].item.name).toBe("scroll0")
            expect(result.skippedDueToSpace.length).toBe(0)
        })

        it("should respect maxItemsToBuy option", () => {
            const pontyItems = [
                { name: "ringsj", level: 0, q: 1 },
                { name: "scroll0", level: 0, q: 10 },
            ]
            const inventory = [null, null, null, null]

            const result = evaluatePontyPurchases(
                pontyItems,
                inventory,
                1_000_000,
                testCatalog,
                mockGData,
                { maxItemsToBuy: 1 },
            )

            expect(result.itemsToBuy.length).toBe(1)
            expect(result.itemsToBuy[0].item.name).toBe("ringsj")
        })
    })

    describe("evaluateStandListings (Pure)", () => {
        it("should allocate empty stand slots to eligible inventory items", () => {
            const inventory = [
                { name: "sword", level: 0 }, // eligible: policy.list = true, sellPrice = 3000
                { name: "pants", level: 0 }, // eligible: policy.list = true, sellPrice = "npc"
                { name: "seashell", q: 10 }, // not eligible: list not set
                { name: "hpbelt", level: 0 }, // not eligible: hold = true
                null,
            ]
            const currentSlots = {} // all stand slots empty

            const result = evaluateStandListings(
                inventory,
                currentSlots,
                testCatalog,
                mockGData,
            )

            expect(result.listingsToAdd.length).toBe(2)
            expect(result.listingsToAdd[0]).toEqual({
                type: "list",
                itemPos: 0,
                tradeSlot: "trade1",
                name: "sword",
                price: 3000,
                quantity: 1,
            })
            expect(result.listingsToAdd[1].tradeSlot).toBe("trade2")
            expect(result.listingsToAdd[1].name).toBe("pants")
            expect(result.listingsToAdd[1].price).toBeGreaterThan(0)
            expect(result.listingsToRemove.length).toBe(0)
            expect(result.activeListingsCount).toBe(0)
        })

        it("should generate delist actions for stand items that are no longer listed or should be held", () => {
            const inventory: any[] = []
            const currentSlots = {
                trade1: { name: "sword", price: 3000, q: 1 }, // valid listing
                trade2: { name: "seashell", price: 50, q: 10 }, // invalid: policy.list is not true
                trade3: { name: "hpbelt", price: 50000, q: 1 }, // invalid: should be held
            }

            const result = evaluateStandListings(
                inventory,
                currentSlots,
                testCatalog,
                mockGData,
            )

            expect(result.activeListingsCount).toBe(1)
            expect(result.listingsToRemove.length).toBe(2)
            expect(result.listingsToRemove.some((r) => r.tradeSlot === "trade2")).toBe(true)
            expect(result.listingsToRemove.some((r) => r.tradeSlot === "trade3")).toBe(true)
        })

        it("should correctly calculate prices for level-mapped sellPrice policies", () => {
            const inventory = [
                { name: "coat", level: 0 }, // level 0 -> 5000
                { name: "coat", level: 1 }, // level 1 -> 10000
            ]
            const currentSlots = {}

            const result = evaluateStandListings(
                inventory,
                currentSlots,
                testCatalog,
                mockGData,
            )

            expect(result.listingsToAdd.length).toBe(2)
            expect(result.listingsToAdd[0].price).toBe(5000)
            expect(result.listingsToAdd[1].price).toBe(10000)
        })
    })

    describe("evaluateStandState (Pure)", () => {
        it("should decide to close stand when character is moving while stand is open", () => {
            const result = evaluateStandState({
                isMoving: true,
                hasCourierTrip: false,
                isStandOpen: true,
                hasStandItem: true,
                inVendingLocation: true,
            })

            expect(result.decision).toBe("close")
        })

        it("should decide to close stand when character has an active courier trip while stand is open", () => {
            const result = evaluateStandState({
                isMoving: false,
                hasCourierTrip: true,
                isStandOpen: true,
                hasStandItem: true,
                inVendingLocation: true,
            })

            expect(result.decision).toBe("close")
        })

        it("should decide to open stand when stationary with stand item in vending area", () => {
            const result = evaluateStandState({
                isMoving: false,
                hasCourierTrip: false,
                isStandOpen: false,
                hasStandItem: true,
                inVendingLocation: true,
            })

            expect(result.decision).toBe("open")
        })

        it("should decide 'none' when merchant does not have a stand item", () => {
            const result = evaluateStandState({
                isMoving: false,
                hasCourierTrip: false,
                isStandOpen: false,
                hasStandItem: false,
                inVendingLocation: true,
            })

            expect(result.decision).toBe("none")
        })

        it("should decide 'none' when not in vending location", () => {
            const result = evaluateStandState({
                isMoving: false,
                hasCourierTrip: false,
                isStandOpen: false,
                hasStandItem: true,
                inVendingLocation: false,
            })

            expect(result.decision).toBe("none")
        })

        it("should decide 'none' when stand is already open and properly stationary", () => {
            const result = evaluateStandState({
                isMoving: false,
                hasCourierTrip: false,
                isStandOpen: true,
                hasStandItem: true,
                inVendingLocation: true,
            })

            expect(result.decision).toBe("none")
        })
    })

    describe("MerchantTradeService Orchestration", () => {
        it("should execute Ponty purchases on the character socket and deduct gold", async () => {
            const service = new MerchantTradeService({ minGoldReserve: 50_000 })
            const bot = new MockCharacter({ ctype: "merchant", gold: 300_000 })

            const plan = {
                itemsToBuy: [
                    { item: { name: "ringsj", level: 0, price: 32_000 }, unitPrice: 32_000, quantity: 1, totalCost: 32_000 },
                ],
                totalCost: 32_000,
                remainingGold: 268_000,
                skippedDueToReserve: [],
                skippedDueToSpace: [],
            }

            const count = await service.executePontyPurchases(bot, plan)

            expect(count).toBe(1)
            expect(bot.calls.some((c) => c.method === "buyFromPonty")).toBe(true)
            expect(bot.gold).toBe(268_000)
        })

        it("should execute stand updates (delisting and listing) on the character socket", async () => {
            const service = new MerchantTradeService()
            const bot = new MockCharacter({ ctype: "merchant" })
            bot.items = [{ name: "sword", level: 0 }, null]
            bot.slots = { trade1: { name: "seashell", price: 10, q: 5 } }

            const plan = {
                listingsToAdd: [
                    { type: "list" as const, itemPos: 0, tradeSlot: "trade1" as const, name: "sword", price: 3000, quantity: 1 },
                ],
                listingsToRemove: [
                    { type: "delist" as const, tradeSlot: "trade1" as const, name: "seashell" },
                ],
                activeListingsCount: 0,
                availableTradeSlots: ["trade2" as const],
            }

            const { listed, delisted } = await service.executeStandUpdates(bot, plan)

            expect(delisted).toBe(1)
            expect(listed).toBe(1)
            expect(bot.calls.some((c) => c.method === "unequip")).toBe(true)
            expect(bot.calls.some((c) => c.method === "listForSale")).toBe(true)
        })

        it("should synchronize stand open/close state based on bot activity", async () => {
            const service = new MerchantTradeService()
            const bot = new MockCharacter({ ctype: "merchant" })
            bot.items = [{ name: "stand0" }] // has stand item

            // 1. Bot is stationary in town -> should open stand
            let decision = await service.syncStandState(bot, false, true)
            expect(decision).toBe("open")
            expect(bot.stand).toBe(true)

            // 2. Bot starts moving -> should close stand
            bot.moving = true
            decision = await service.syncStandState(bot, false, true)
            expect(decision).toBe("close")
            expect(bot.stand).toBe(false)
        })
    })

    describe("MerchantTradeAction Dynamic Priority & Utility Scoring", () => {
        let eventBus: EventBus
        let blackboard: TeamBlackboard
        let action: MerchantTradeAction

        beforeEach(() => {
            eventBus = new EventBus()
            blackboard = new TeamBlackboard("US", "I", eventBus)
            action = new MerchantTradeAction({
                gData: mockGData,
                catalog: testCatalog,
                minGoldReserve: 50_000,
            })
        })

        it("should refuse to execute for non-merchant characters", () => {
            const warrior = new MockCharacter({ ctype: "warrior" })
            const context = { blackboard, eventBus }

            expect(action.canExecute(warrior, context)).toBe(false)
            expect(action.score(warrior, context)).toBe(0)
        })

        it("should assign emergency score 95 when stand is open while bot is moving", () => {
            const merchant = new MockCharacter({ ctype: "merchant" })
            merchant.stand = true
            merchant.moving = true
            const context = { blackboard, eventBus }

            const score = action.score(merchant, context)
            expect(score).toBe(95)
        })

        it("should assign score 90 to close stand when courier supplies are urgently requested", () => {
            const merchant = new MockCharacter({ ctype: "merchant" })
            merchant.stand = true
            merchant.moving = false
            const context = { blackboard, eventBus }

            // Broadcast supply need for party member
            eventBus.publish({
                type: "supply:needed",
                botName: "TankWarrior",
                item: "hpot1",
                quantityNeeded: 200,
            })

            const score = action.score(merchant, context)
            expect(score).toBe(90)
        })

        it("should yield (score = 0) to courier service when supplies are needed and stand is already closed", () => {
            const merchant = new MockCharacter({ ctype: "merchant" })
            merchant.stand = false
            merchant.moving = false
            const context = { blackboard, eventBus }

            eventBus.publish({
                type: "supply:needed",
                botName: "TankWarrior",
                item: "hpot1",
                quantityNeeded: 200,
            })

            const score = action.score(merchant, context)
            expect(score).toBe(0)
        })

        it("should assign high priority score 65 when Ponty has affordable snipable items", () => {
            const merchant = new MockCharacter({ ctype: "merchant", gold: 500_000 })
            merchant.stand = false
            merchant.moving = false
            merchant.items = [null, null, null]
            merchant.pontyItems = [
                { name: "ringsj", level: 0, q: 1, price: 32_000 },
            ]
            const context = { blackboard, eventBus }

            const score = action.score(merchant, context)
            expect(score).toBe(65)
        })

        it("should assign score 35 during idle town cycles to maintain stand and listings", () => {
            const merchant = new MockCharacter({ ctype: "merchant", gold: 100_000 })
            merchant.stand = false
            merchant.moving = false
            merchant.items = [{ name: "stand0" }, { name: "sword", level: 0 }]
            merchant.slots = {}
            const context = { blackboard, eventBus }

            const score = action.score(merchant, context)
            expect(score).toBe(35)
        })

        it("should execute full trade cycle: sniping Ponty, updating stand listings, and opening stand", async () => {
            const merchant = new MockCharacter({ ctype: "merchant", gold: 500_000 })
            merchant.stand = false
            merchant.moving = false
            merchant.items = [{ name: "stand0" }, { name: "sword", level: 0 }, null]
            merchant.pontyItems = [
                { name: "scroll0", level: 0, q: 10, price: 4000 },
            ]
            const context = { blackboard, eventBus }

            await action.execute(merchant, context)

            // Should have bought scroll0 from Ponty
            expect(merchant.calls.some((c) => c.method === "buyFromPonty")).toBe(true)
            // Should have listed sword on stand
            expect(merchant.calls.some((c) => c.method === "listForSale")).toBe(true)
            // Should have opened merchant stand
            expect(merchant.calls.some((c) => c.method === "openMerchantStand")).toBe(true)
            expect(merchant.stand).toBe(true)
        })
    })
})
