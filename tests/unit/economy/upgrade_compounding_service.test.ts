import { describe, expect, it } from "bun:test"
import { createMockGData } from "../../../src/test_support/g_data.mock.js"
import { buildItemCatalog } from "../../../src/domain/items/configs/index.js"
import { UpgradeCompoundingService } from "../../../src/domain/economy/upgrade_compounding_service.js"

describe("UpgradeCompoundingService", () => {
    const gData = createMockGData()
    const catalog = buildItemCatalog()
    const service = new UpgradeCompoundingService({
        defaultUpgradeOfferingLevel: 8,
        defaultCompoundOfferingLevel: 2,
    })

    describe("getItemGrade & selectScroll", () => {
        it("should correctly evaluate item grade based on level and GData grade thresholds", () => {
            // sword has grades: [7, 9, 10, 11]
            expect(UpgradeCompoundingService.getItemGrade({ name: "sword", level: 0 }, gData)).toBe(0)
            expect(UpgradeCompoundingService.getItemGrade({ name: "sword", level: 6 }, gData)).toBe(0)
            expect(UpgradeCompoundingService.getItemGrade({ name: "sword", level: 7 }, gData)).toBe(1)
            expect(UpgradeCompoundingService.getItemGrade({ name: "sword", level: 8 }, gData)).toBe(1)
            expect(UpgradeCompoundingService.getItemGrade({ name: "sword", level: 9 }, gData)).toBe(2)
        })

        it("should select matching scroll tiers for upgrade and compound", () => {
            expect(UpgradeCompoundingService.selectScroll("upgrade", 0)).toBe("scroll0")
            expect(UpgradeCompoundingService.selectScroll("upgrade", 1)).toBe("scroll1")
            expect(UpgradeCompoundingService.selectScroll("upgrade", 2)).toBe("scroll2")

            expect(UpgradeCompoundingService.selectScroll("compound", 0)).toBe("cscroll0")
            expect(UpgradeCompoundingService.selectScroll("compound", 1)).toBe("cscroll1")
            expect(UpgradeCompoundingService.selectScroll("compound", 2)).toBe("cscroll2")
        })
    })

    describe("evaluateUpgradeCandidates", () => {
        it("should identify upgradable items, select scroll0 for low levels and scroll1 + offering for high levels", () => {
            const testCatalog = {
                ...catalog,
                coat: { upgradeUntilLevel: 10, offeringAtLevel: 8 },
            }

            const inventory = [
                { name: "sword", level: 0 }, // Low level -> scroll0, no offering
                { name: "sword", level: 7 }, // Grade 1 -> scroll1, no offering (7 < 8)
                { name: "coat", level: 8 },  // Grade 1, level 8 -> scroll1 + offering
                { name: "sword", level: 9 }, // Reached maxLevel (default 8) -> Skip!
                null,
            ]

            const candidates = service.evaluateUpgradeCandidates(inventory, testCatalog, gData)

            expect(candidates.length).toBe(3)

            // Sorted lowest level first
            expect(candidates[0].currentLevel).toBe(0)
            expect(candidates[0].scroll).toBe("scroll0")
            expect(candidates[0].offering).toBeUndefined()
            expect(candidates[0].cost).toBe(1000)

            expect(candidates[1].currentLevel).toBe(7)
            expect(candidates[1].scroll).toBe("scroll1")
            expect(candidates[1].offering).toBeUndefined()
            expect(candidates[1].cost).toBe(40000)

            expect(candidates[2].currentLevel).toBe(8)
            expect(candidates[2].scroll).toBe("scroll1")
            expect(candidates[2].offering).toBe("offering")
            expect(candidates[2].cost).toBe(40000 + 3200000)
        })
    })

    describe("evaluateCompoundCandidates", () => {
        it("should group identical accessories into triplets and choose correct compound scrolls and offerings", () => {
            const testCatalog = {
                ...catalog,
                ringsj: { compoundUntilLevel: 3, offeringAtLevel: 1 },
            }

            const inventory = [
                { name: "ringsj", level: 0 }, // Triplet 1 member A
                { name: "ringsj", level: 0 }, // Triplet 1 member B
                { name: "ringsj", level: 0 }, // Triplet 1 member C
                { name: "ringsj", level: 0 }, // Extra ring -> Not part of triplet
                { name: "hpbelt", level: 1 }, // Lone belt -> Not part of triplet
                { name: "ringsj", level: 1 }, // Triplet 2 member A (level 1)
                { name: "ringsj", level: 1 }, // Triplet 2 member B (level 1)
                { name: "ringsj", level: 1 }, // Triplet 2 member C (level 1)
            ]

            const candidates = service.evaluateCompoundCandidates(inventory, testCatalog, gData)

            expect(candidates.length).toBe(2)

            // Triplet 1: Level 0 rings -> cscroll0, no offering
            const level0Candidate = candidates.find((c) => c.currentLevel === 0)
            expect(level0Candidate).toBeDefined()
            expect(level0Candidate?.inventoryIndices).toEqual([0, 1, 2])
            expect(level0Candidate?.scroll).toBe("cscroll0")
            expect(level0Candidate?.offering).toBeUndefined()

            // Triplet 2: Level 1 rings -> cscroll0, with offering (level 1 >= 1)
            const level1Candidate = candidates.find((c) => c.currentLevel === 1)
            expect(level1Candidate).toBeDefined()
            expect(level1Candidate?.inventoryIndices).toEqual([5, 6, 7])
            expect(level1Candidate?.scroll).toBe("cscroll0")
            expect(level1Candidate?.offering).toBe("offering")
        })
    })

    describe("calculateTotalBatchCost", () => {
        it("should sum the exact cost of upgrade and compound scrolls and offerings", () => {
            const upgrades = [
                { inventoryIndex: 0, item: { name: "sword" }, currentLevel: 0, targetLevel: 1, grade: 0, scroll: "scroll0" as const, cost: 1000 },
                { inventoryIndex: 1, item: { name: "coat" }, currentLevel: 7, targetLevel: 8, grade: 1, scroll: "scroll1" as const, cost: 40000 },
            ]
            const compounds = [
                { inventoryIndices: [2, 3, 4] as [number, number, number], item: { name: "ringsj" }, currentLevel: 0, targetLevel: 1, grade: 0, scroll: "cscroll0" as const, cost: 1000 },
            ]

            const total = service.calculateTotalBatchCost(upgrades, compounds)
            expect(total).toBe(1000 + 40000 + 1000)
        })
    })
})
