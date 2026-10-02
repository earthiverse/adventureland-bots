import type { GData, ItemName } from "alclient"
import type { ItemCatalog } from "../items/item_schema.js"
import {
    getUpgradeRule,
    shouldCompound,
    type ItemLike,
} from "../items/item_queries.js"

export interface UpgradeCandidate {
    inventoryIndex: number
    item: ItemLike
    currentLevel: number
    targetLevel: number
    grade: number
    scroll: ItemName
    offering?: ItemName
    cost: number
}

export interface CompoundCandidate {
    inventoryIndices: [number, number, number]
    item: ItemLike
    currentLevel: number
    targetLevel: number
    grade: number
    scroll: ItemName
    offering?: ItemName
    cost: number
}

export interface UpgradeCompoundingOptions {
    /** Minimum level at which to start using offerings for upgrades (default: 8) */
    defaultUpgradeOfferingLevel?: number
    /** Minimum level at which to start using offerings for compounds (default: 2) */
    defaultCompoundOfferingLevel?: number
}

export class UpgradeCompoundingService {
    private readonly upgradeOfferingLevel: number
    private readonly compoundOfferingLevel: number

    public constructor(options: UpgradeCompoundingOptions = {}) {
        this.upgradeOfferingLevel = options.defaultUpgradeOfferingLevel ?? 8
        this.compoundOfferingLevel = options.defaultCompoundOfferingLevel ?? 2
    }

    /**
     * Calculates the grade (0, 1, 2) of an item based on its level and GData threshold definitions.
     */
    public static getItemGrade(item: { name: ItemName | string; level?: number }, gData: GData): number {
        const gItem = gData.items[item.name as ItemName]
        if (!gItem?.grades) return 0

        const level = item.level ?? 0
        let grade = 0
        for (const threshold of gItem.grades) {
            if (level < threshold) break
            grade++
        }
        return grade
    }

    /**
     * Selects the correct tier of scroll (Scroll 0 vs Scroll 1 vs Scroll 2) matching item grade.
     */
    public static selectScroll(type: "upgrade" | "compound", grade: number): ItemName {
        if (type === "upgrade") {
            if (grade <= 0) return "scroll0"
            if (grade === 1) return "scroll1"
            return "scroll2"
        } else {
            if (grade <= 0) return "cscroll0"
            if (grade === 1) return "cscroll1"
            return "cscroll2"
        }
    }

    /**
     * Evaluates inventory to find all items eligible to be upgraded.
     */
    public evaluateUpgradeCandidates(
        inventory: Array<ItemLike | null>,
        catalog: ItemCatalog,
        gData: GData,
    ): UpgradeCandidate[] {
        const candidates: UpgradeCandidate[] = []

        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i]
            if (!item) continue

            const policy = catalog[item.name as ItemName]
            const rule = getUpgradeRule(policy, item, gData)

            if (!rule.canUpgrade) continue

            const currentLevel = item.level ?? 0
            const grade = UpgradeCompoundingService.getItemGrade(item, gData)
            const scroll = UpgradeCompoundingService.selectScroll("upgrade", grade)

            // Offering selection
            let offering: ItemName | undefined
            const policyOfferingLevel = policy?.offeringAtLevel ?? this.upgradeOfferingLevel
            if (currentLevel >= policyOfferingLevel) {
                offering = "offering"
            }

            // Estimate cost
            const scrollPrice = gData.items[scroll]?.g ?? 1000
            const offeringPrice = offering ? (gData.items[offering]?.g ?? 3_200_000) : 0

            candidates.push({
                inventoryIndex: i,
                item,
                currentLevel,
                targetLevel: currentLevel + 1,
                grade,
                scroll,
                offering,
                cost: scrollPrice + offeringPrice,
            })
        }

        // Sort candidates: prioritize lowest level first (cheaper and safer to upgrade early)
        candidates.sort((a, b) => a.currentLevel - b.currentLevel)

        return candidates
    }

    /**
     * Evaluates inventory to find accessories that can be combined in triplets.
     */
    public evaluateCompoundCandidates(
        inventory: Array<ItemLike | null>,
        catalog: ItemCatalog,
        gData: GData,
    ): CompoundCandidate[] {
        const candidates: CompoundCandidate[] = []

        // Group eligible items by `${name}:${level}`
        const groups = new Map<string, Array<{ index: number; item: ItemLike }>>()

        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i]
            if (!item) continue

            const policy = catalog[item.name as ItemName]
            const rule = shouldCompound(policy, item, gData)

            if (!rule.canCompound) continue

            const key = `${item.name}:${item.level ?? 0}`
            if (!groups.has(key)) {
                groups.set(key, [])
            }
            groups.get(key)!.push({ index: i, item })
        }

        // Form triplets of 3 identical accessories
        for (const [, items] of groups) {
            const tripletCount = Math.floor(items.length / 3)

            for (let t = 0; t < tripletCount; t++) {
                const item1 = items[t * 3]
                const item2 = items[t * 3 + 1]
                const item3 = items[t * 3 + 2]

                const currentLevel = item1.item.level ?? 0
                const grade = UpgradeCompoundingService.getItemGrade(item1.item, gData)
                const scroll = UpgradeCompoundingService.selectScroll("compound", grade)

                const policy = catalog[item1.item.name as ItemName]
                let offering: ItemName | undefined
                const policyOfferingLevel = policy?.offeringAtLevel ?? this.compoundOfferingLevel
                if (currentLevel >= policyOfferingLevel) {
                    offering = "offering"
                }

                const scrollPrice = gData.items[scroll]?.g ?? 6400
                const offeringPrice = offering ? (gData.items[offering]?.g ?? 3_200_000) : 0

                candidates.push({
                    inventoryIndices: [item1.index, item2.index, item3.index],
                    item: item1.item,
                    currentLevel,
                    targetLevel: currentLevel + 1,
                    grade,
                    scroll,
                    offering,
                    cost: scrollPrice + offeringPrice,
                })
            }
        }

        // Sort: lower level compounds first
        candidates.sort((a, b) => a.currentLevel - b.currentLevel)

        return candidates
    }

    /**
     * Calculates total gold required to execute a list of upgrade and compound actions.
     */
    public calculateTotalBatchCost(
        upgrades: UpgradeCandidate[],
        compounds: CompoundCandidate[],
    ): number {
        const upgradeCost = upgrades.reduce((sum, u) => sum + u.cost, 0)
        const compoundCost = compounds.reduce((sum, c) => sum + c.cost, 0)
        return upgradeCost + compoundCost
    }
}
