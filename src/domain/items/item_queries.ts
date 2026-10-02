import type { GData, ItemName } from "alclient"
import type { CharacterType, ItemPolicy } from "./item_schema.js"

export interface ItemLike {
    name: ItemName | string
    level?: number
    q?: number
    l?: string | boolean // locked
    p?: string // special / shiny / glitched
    e?: number // exchangeable stack size
}

/**
 * Calculates the NPC vendor sale value for an item based on GData.
 */
export function calculateItemNpcValue(item: ItemLike, gData: GData): number {
    const gItem = gData.items[item.name as ItemName]
    if (!gItem) return 0

    const baseCost = gItem.g ?? 0
    const multiplier = gData.multipliers?.buy_to_sell ?? 0.5
    let value = Math.round(baseCost * multiplier)

    // AdventureLand scales value with level for upgraded/compounded gear
    const level = item.level ?? 0
    if (level > 0) {
        if (gItem.upgrade) {
            value = Math.round(value * Math.pow(1.6, level))
        } else if (gItem.compound) {
            value = Math.round(value * Math.pow(2.4, level))
        }
    }

    return Math.max(1, value)
}

/**
 * Determines whether a character should keep/hold an item in inventory.
 */
export function shouldHold(
    policy: ItemPolicy | undefined,
    item: ItemLike,
    characterType: CharacterType,
): boolean {
    // Always hold locked items
    if (item.l) return true

    if (!policy || !policy.hold) return false
    if (policy.hold === true) return true
    if (Array.isArray(policy.hold)) {
        return policy.hold.includes(characterType)
    }

    return false
}

/**
 * Checks whether an item quantity is below target replenishment threshold.
 */
export function shouldReplenish(
    policy: ItemPolicy | undefined,
    currentQuantity: number,
    characterType: CharacterType,
): { needed: number; holdSlot?: number } | false {
    if (!policy?.replenish) return false

    // Character must be designated to hold this item
    if (!shouldHold(policy, { name: "" }, characterType)) return false

    if (currentQuantity < policy.replenish) {
        return {
            needed: policy.replenish - currentQuantity,
            holdSlot: policy.holdSlot,
        }
    }

    return false
}

/**
 * Determines whether an item is eligible for NPC sale and calculates minimum price.
 */
export function isSellable(
    policy: ItemPolicy | undefined,
    item: ItemLike,
    gData: GData,
    characterType: CharacterType,
): { sellTo: "npc" | "player"; minPrice: number } | false {
    // Never sell locked or special items
    if (item.l || item.p) return false

    // Never sell items the character is meant to hold
    if (shouldHold(policy, item, characterType)) return false

    if (!policy?.sell) return false

    const npcValue = calculateItemNpcValue(item, gData)

    if (policy.sellPrice === "npc") {
        return { sellTo: "npc", minPrice: npcValue }
    }

    if (typeof policy.sellPrice === "number") {
        if (npcValue >= policy.sellPrice) {
            return { sellTo: "npc", minPrice: policy.sellPrice }
        }
    }

    if (policy.sellPrice && typeof policy.sellPrice === "object") {
        const targetPrice = policy.sellPrice[item.level ?? 0]
        if (targetPrice !== undefined && npcValue >= targetPrice) {
            return { sellTo: "npc", minPrice: targetPrice }
        }
    }

    return false
}

/**
 * Retrieves upgrade rules for an item.
 */
export function getUpgradeRule(
    policy: ItemPolicy | undefined,
    item: ItemLike,
    gData: GData,
): { canUpgrade: boolean; maxLevel: number; destroyBelow?: number } {
    if (item.l) return { canUpgrade: false, maxLevel: 0 }

    const gItem = gData.items[item.name as ItemName]
    if (!gItem?.upgrade) return { canUpgrade: false, maxLevel: 0 }

    // Check if designated for destruction below a specific level
    if (policy?.destroyBelowLevel !== undefined && (item.level ?? 0) < policy.destroyBelowLevel) {
        return {
            canUpgrade: false,
            maxLevel: 0,
            destroyBelow: policy.destroyBelowLevel,
        }
    }

    const maxLevel = policy?.upgradeUntilLevel ?? 8
    const canUpgrade = (item.level ?? 0) < maxLevel

    return {
        canUpgrade,
        maxLevel,
        destroyBelow: policy?.destroyBelowLevel,
    }
}

/**
 * Retrieves compound rules for accessory items.
 */
export function shouldCompound(
    policy: ItemPolicy | undefined,
    item: ItemLike,
    gData: GData,
): { canCompound: boolean; maxLevel: number } {
    if (item.l) return { canCompound: false, maxLevel: 0 }

    const gItem = gData.items[item.name as ItemName]
    if (!gItem?.compound) return { canCompound: false, maxLevel: 0 }

    const maxLevel = policy?.compoundUntilLevel ?? 2
    const canCompound = (item.level ?? 0) < maxLevel

    return { canCompound, maxLevel }
}

/**
 * Determines whether an item should be dismantled at the craftsman.
 */
export function shouldDismantle(policy: ItemPolicy | undefined, item: ItemLike): boolean {
    if (item.l) return false
    return Boolean(policy?.dismantle)
}

/**
 * Determines whether an item should be exchanged at the exchange NPC.
 */
export function shouldExchange(
    policy: ItemPolicy | undefined,
    item: ItemLike,
    gData: GData,
): boolean {
    if (item.l) return false
    if (!policy?.exchange) return false

    const gItem = gData.items[item.name as ItemName]
    const requiredStack = gItem?.e ?? item.e ?? 1

    if (policy.exchangeAtLevel !== undefined && (item.level ?? 0) !== policy.exchangeAtLevel) {
        return false
    }

    return (item.q ?? 1) >= requiredStack
}

/**
 * Checks whether an item should be bought from Ponty (the secondhand dealer).
 */
export function shouldBuyFromPonty(
    policy: ItemPolicy | undefined,
    item: ItemLike,
    gData: GData,
): boolean {
    if (!policy?.buy) return false

    if (policy.buyPrice === "ponty") return true

    if (typeof policy.buyPrice === "number") {
        const gItem = gData.items[item.name as ItemName]
        const mult = gData.multipliers?.secondhands_mult ?? 2
        const pontyCost = (gItem?.g ?? 0) * mult
        return policy.buyPrice >= pontyCost
    }

    return false
}
