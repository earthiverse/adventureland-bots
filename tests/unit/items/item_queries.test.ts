import { describe, expect, it } from "bun:test"
import {
    calculateItemNpcValue,
    getUpgradeRule,
    isSellable,
    shouldBuyFromPonty,
    shouldCompound,
    shouldExchange,
    shouldHold,
    shouldReplenish,
} from "../../../src/domain/items/item_queries.js"
import { createMockGData } from "../../../src/test_support/g_data.mock.js"

describe("ItemQueries", () => {
    const mockGData = createMockGData()

    describe("calculateItemNpcValue", () => {
        it("should calculate correct base NPC value using buy_to_sell multiplier", () => {
            // coat has g = 4000, buy_to_sell = 0.5 -> 2000
            const val = calculateItemNpcValue({ name: "coat", level: 0 }, mockGData)
            expect(val).toBe(2000)
        })

        it("should scale value for upgraded equipment", () => {
            const valL0 = calculateItemNpcValue({ name: "coat", level: 0 }, mockGData)
            const valL1 = calculateItemNpcValue({ name: "coat", level: 1 }, mockGData)
            expect(valL1).toBeGreaterThan(valL0)
        })
    })

    describe("shouldHold", () => {
        it("should always hold locked items regardless of policy", () => {
            expect(shouldHold(undefined, { name: "coat", l: true }, "warrior")).toBe(true)
            expect(shouldHold({ hold: false as any }, { name: "coat", l: "locked" }, "mage")).toBe(true)
        })

        it("should hold when policy is globally true", () => {
            expect(shouldHold({ hold: true }, { name: "hpot1" }, "warrior")).toBe(true)
            expect(shouldHold({ hold: true }, { name: "hpot1" }, "priest")).toBe(true)
        })

        it("should hold only for specified character classes", () => {
            const policy = { hold: ["merchant"] as any }
            expect(shouldHold(policy, { name: "offering" }, "merchant")).toBe(true)
            expect(shouldHold(policy, { name: "offering" }, "warrior")).toBe(false)
        })
    })

    describe("shouldReplenish", () => {
        it("should calculate needed quantity when current is below threshold", () => {
            const policy = { hold: true, replenish: 1000, holdSlot: 39 }
            const result = shouldReplenish(policy, 300, "warrior")

            expect(result).not.toBe(false)
            if (result) {
                expect(result.needed).toBe(700)
                expect(result.holdSlot).toBe(39)
            }
        })

        it("should return false when quantity is already satisfied", () => {
            const policy = { hold: true, replenish: 1000 }
            expect(shouldReplenish(policy, 1000, "warrior")).toBe(false)
            expect(shouldReplenish(policy, 1500, "warrior")).toBe(false)
        })

        it("should return false if character class is not designated to hold the item", () => {
            const policy = { hold: ["merchant"] as any, replenish: 50 }
            expect(shouldReplenish(policy, 0, "warrior")).toBe(false)
        })
    })

    describe("isSellable", () => {
        it("should protect locked, special, or held items from being sold", () => {
            const sellPolicy = { sell: true, sellPrice: "npc" as const }

            expect(isSellable(sellPolicy, { name: "coat", l: true }, mockGData, "warrior")).toBe(false)
            expect(isSellable(sellPolicy, { name: "coat", p: "shiny" }, mockGData, "warrior")).toBe(false)
            expect(
                isSellable({ ...sellPolicy, hold: true }, { name: "coat" }, mockGData, "warrior"),
            ).toBe(false)
        })

        it("should approve NPC sale when sellPrice is 'npc'", () => {
            const sellPolicy = { sell: true, sellPrice: "npc" as const }
            const result = isSellable(sellPolicy, { name: "coat", level: 0 }, mockGData, "warrior")

            expect(result).not.toBe(false)
            if (result) {
                expect(result.sellTo).toBe("npc")
                expect(result.minPrice).toBe(2000)
            }
        })

        it("should respect numerical minimum sell prices", () => {
            // coat npcValue is 2000
            const highFloorPolicy = { sell: true, sellPrice: 5000 }
            expect(isSellable(highFloorPolicy, { name: "coat", level: 0 }, mockGData, "warrior")).toBe(false)

            const lowFloorPolicy = { sell: true, sellPrice: 1500 }
            const result = isSellable(lowFloorPolicy, { name: "coat", level: 0 }, mockGData, "warrior")
            expect(result).not.toBe(false)
        })
    })

    describe("getUpgradeRule", () => {
        it("should allow upgrade if item is upgradable and below maxLevel", () => {
            const policy = { upgradeUntilLevel: 7 }
            const rule = getUpgradeRule(policy, { name: "coat", level: 5 }, mockGData)

            expect(rule.canUpgrade).toBe(true)
            expect(rule.maxLevel).toBe(7)
        })

        it("should disallow upgrade if level reaches or exceeds maxLevel", () => {
            const policy = { upgradeUntilLevel: 7 }
            const rule = getUpgradeRule(policy, { name: "coat", level: 7 }, mockGData)

            expect(rule.canUpgrade).toBe(false)
        })

        it("should flag destroyBelow if item is below threshold", () => {
            const policy = { destroyBelowLevel: 3, upgradeUntilLevel: 8 }
            const rule = getUpgradeRule(policy, { name: "coat", level: 1 }, mockGData)

            expect(rule.canUpgrade).toBe(false)
            expect(rule.destroyBelow).toBe(3)
        })

        it("should not allow upgrade on non-upgradable items or locked items", () => {
            expect(getUpgradeRule(undefined, { name: "hpot1" }, mockGData).canUpgrade).toBe(false)
            expect(getUpgradeRule(undefined, { name: "coat", l: true }, mockGData).canUpgrade).toBe(false)
        })
    })

    describe("shouldCompound", () => {
        it("should allow compounding accessories below maxLevel", () => {
            const policy = { compoundUntilLevel: 2 }
            const rule = shouldCompound(policy, { name: "ringsj", level: 1 }, mockGData)

            expect(rule.canCompound).toBe(true)
            expect(rule.maxLevel).toBe(2)
        })

        it("should disallow compounding non-compoundable items", () => {
            const rule = shouldCompound(undefined, { name: "coat", level: 0 }, mockGData)
            expect(rule.canCompound).toBe(false)
        })
    })

    describe("shouldExchange", () => {
        it("should return true when exchange stack requirements are met", () => {
            // anniversarygift has e: undefined/1 in mock
            const policy = { exchange: true }
            expect(shouldExchange(policy, { name: "seashell", q: 20, e: 20 }, mockGData)).toBe(true)
            expect(shouldExchange(policy, { name: "seashell", q: 5, e: 20 }, mockGData)).toBe(false)
        })
    })

    describe("shouldBuyFromPonty", () => {
        it("should approve ponty buys when buyPrice is 'ponty'", () => {
            const policy = { buy: true, buyPrice: "ponty" as const }
            expect(shouldBuyFromPonty(policy, { name: "coat" }, mockGData)).toBe(true)
        })

        it("should compare against ponty multiplier when price is numeric", () => {
            // coat g=4000, secondhands_mult=2 -> ponty cost = 8000
            const generousPolicy = { buy: true, buyPrice: 10000 }
            expect(shouldBuyFromPonty(generousPolicy, { name: "coat" }, mockGData)).toBe(true)

            const stingyPolicy = { buy: true, buyPrice: 5000 }
            expect(shouldBuyFromPonty(stingyPolicy, { name: "coat" }, mockGData)).toBe(false)
        })
    })
})
