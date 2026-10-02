import type { GData, ItemName } from "alclient"
import type { ItemCatalog } from "../items/item_schema.js"
import {
    getUpgradeRule,
    isSellable,
    shouldCompound,
    shouldExchange,
    shouldHold,
    type ItemLike,
} from "../items/item_queries.js"

export type BankPackName = string
export type BankPack = Array<ItemLike | null>
export type BankMap = Record<BankPackName, BankPack>

export interface BankOptions {
    /** Target gold amount to retain in merchant inventory (default: 200,000) */
    merchantGoldToHold?: number
    /** Minimum gold required in merchant inventory before withdrawing from bank (default: 100,000) */
    minMerchantGold?: number
    /** Whether to deposit locked items (default: false) */
    depositLockedItems?: boolean
}

export interface DepositDecision {
    inventoryIndex: number
    item: ItemLike
    reason: string
}

export interface WithdrawalDecision {
    packName: BankPackName
    packIndex: number
    item: ItemLike
    reason: "upgrade" | "compound" | "exchange" | "restock"
}

export interface BankConsolidationStep {
    sourcePack: BankPackName
    sourceIndex: number
    targetPack: BankPackName
    targetIndex: number
    itemName: ItemName | string
    quantityMoved: number
}

export class BankService {
    private readonly goldToHold: number
    private readonly minMerchantGold: number
    private readonly depositLocked: boolean

    public constructor(options: BankOptions = {}) {
        this.goldToHold = options.merchantGoldToHold ?? 200_000
        this.minMerchantGold = options.minMerchantGold ?? 100_000
        this.depositLocked = options.depositLockedItems ?? false
    }

    /**
     * Evaluates merchant inventory and determines which items should be deposited into the bank.
     */
    public evaluateDeposits(
        inventory: Array<ItemLike | null>,
        catalog: ItemCatalog,
        gData: GData,
    ): DepositDecision[] {
        const decisions: DepositDecision[] = []

        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i]
            if (!item) continue

            // Respect locked items unless configured otherwise
            if (item.l && !this.depositLocked) continue

            const policy = catalog[item.name as ItemName]
            const gItem = gData.items[item.name as ItemName]

            // 1. Items the merchant must hold in active inventory
            if (shouldHold(policy, item, "merchant")) {
                continue
            }

            // 2. Items the merchant can immediately sell to NPC
            const sellDecision = isSellable(policy, item, gData, "merchant")
            if (sellDecision && sellDecision.sellTo === "npc") {
                continue
            }

            // 3. Materials, gems, and crafting components belong in the bank
            if (gItem?.type === "material" || gItem?.type === "misc") {
                decisions.push({
                    inventoryIndex: i,
                    item,
                    reason: "Material / Crafting component",
                })
                continue
            }

            // 4. Equipment not designated for immediate use/selling
            if (!shouldHold(policy, item, "merchant")) {
                decisions.push({
                    inventoryIndex: i,
                    item,
                    reason: "Non-held equipment / inventory clutter",
                })
            }
        }

        return decisions
    }

    /**
     * Evaluates stored bank items and determines what to withdraw for upgrading, compounding, or exchange.
     */
    public evaluateWithdrawals(
        bank: BankMap,
        catalog: ItemCatalog,
        gData: GData,
        merchantFreeSlots: number,
    ): WithdrawalDecision[] {
        const decisions: WithdrawalDecision[] = []
        if (merchantFreeSlots <= 0) return decisions

        let availableSlots = merchantFreeSlots

        // Group accessories across bank to find complete triplets for compounding
        const accessoryTriplets = new Map<string, Array<{ packName: BankPackName; packIndex: number; item: ItemLike }>>()

        for (const [packName, pack] of Object.entries(bank)) {
            if (!Array.isArray(pack)) continue

            for (let i = 0; i < pack.length; i++) {
                const item = pack[i]
                if (!item) continue

                const policy = catalog[item.name as ItemName]
                const gItem = gData.items[item.name as ItemName]

                // Check exchangeable stacks ready to turn in
                if (shouldExchange(policy, item, gData)) {
                    if (availableSlots > 0) {
                        decisions.push({
                            packName,
                            packIndex: i,
                            item,
                            reason: "exchange",
                        })
                        availableSlots--
                    }
                    continue
                }

                // Check upgradable gear
                const upgradeRule = getUpgradeRule(policy, item, gData)
                if (upgradeRule.canUpgrade && (item.level ?? 0) < upgradeRule.maxLevel) {
                    if (availableSlots > 0) {
                        decisions.push({
                            packName,
                            packIndex: i,
                            item,
                            reason: "upgrade",
                        })
                        availableSlots--
                    }
                    continue
                }

                // Collect compoundable accessories
                const compoundRule = shouldCompound(policy, item, gData)
                if (compoundRule.canCompound) {
                    const key = `${item.name}:${item.level ?? 0}`
                    if (!accessoryTriplets.has(key)) {
                        accessoryTriplets.set(key, [])
                    }
                    accessoryTriplets.get(key)!.push({ packName, packIndex: i, item })
                }
            }
        }

        // Add compound triplets if space permits (sets of 3)
        for (const [, candidates] of accessoryTriplets) {
            const tripletCount = Math.floor(candidates.length / 3)
            for (let t = 0; t < tripletCount; t++) {
                if (availableSlots < 3) break
                for (let k = 0; k < 3; k++) {
                    const candidate = candidates[t * 3 + k]
                    decisions.push({
                        packName: candidate.packName,
                        packIndex: candidate.packIndex,
                        item: candidate.item,
                        reason: "compound",
                    })
                    availableSlots--
                }
            }
        }

        return decisions
    }

    /**
     * Determines gold transfer amount between merchant and bank.
     * Positive = deposit to bank, Negative = withdraw from bank.
     */
    public evaluateGoldTransfer(merchantGold: number, bankGold: number): { action: "deposit" | "withdraw" | "none"; amount: number } {
        if (merchantGold > this.goldToHold) {
            return {
                action: "deposit",
                amount: merchantGold - this.goldToHold,
            }
        }

        if (merchantGold < this.minMerchantGold && bankGold > 0) {
            const needed = this.goldToHold - merchantGold
            const withdrawAmount = Math.min(needed, bankGold)
            if (withdrawAmount > 0) {
                return {
                    action: "withdraw",
                    amount: withdrawAmount,
                }
            }
        }

        return { action: "none", amount: 0 }
    }

    /**
     * Consolidates duplicate stacks within or across bank packs to free up slots.
     */
    public optimizeBankLayout(bank: BankMap, gData: GData): BankConsolidationStep[] {
        const steps: BankConsolidationStep[] = []
        const stackMap = new Map<string, { packName: BankPackName; index: number; quantity: number }>()

        for (const [packName, pack] of Object.entries(bank)) {
            if (!Array.isArray(pack)) continue

            for (let i = 0; i < pack.length; i++) {
                const item = pack[i]
                if (!item || item.q === undefined) continue // Only stackable items have quantity

                const gItem = gData.items[item.name as ItemName]
                const maxStack = gItem?.s ?? 9999

                const key = `${item.name}:${item.level ?? 0}`
                const existing = stackMap.get(key)

                if (existing) {
                    const spaceInTarget = maxStack - existing.quantity
                    if (spaceInTarget > 0) {
                        const amountToMove = Math.min(item.q, spaceInTarget)
                        steps.push({
                            sourcePack: packName,
                            sourceIndex: i,
                            targetPack: existing.packName,
                            targetIndex: existing.index,
                            itemName: item.name,
                            quantityMoved: amountToMove,
                        })

                        existing.quantity += amountToMove
                        if (existing.quantity >= maxStack) {
                            stackMap.delete(key)
                        }
                    }
                } else if (item.q < maxStack) {
                    stackMap.set(key, { packName, index: i, quantity: item.q })
                }
            }
        }

        return steps
    }
}
