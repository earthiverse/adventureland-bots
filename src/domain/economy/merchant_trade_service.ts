import type { GData, ItemName, PingCompensatedCharacter, TradeSlotType } from "alclient"
import type { ItemCatalog } from "../items/item_schema.js"
import { calculateItemNpcValue, shouldBuyFromPonty, shouldHold, type ItemLike } from "../items/item_queries.js"

export const DEFAULT_STAND_SLOTS: TradeSlotType[] = [
    "trade1", "trade2", "trade3", "trade4",
    "trade5", "trade6", "trade7", "trade8",
    "trade9", "trade10", "trade11", "trade12",
    "trade13", "trade14", "trade15", "trade16",
]

export const DEFAULT_STAND_ITEMS = ["stand0", "stand1", "computer", "supercomputer"]

export interface PontyPurchaseItem {
    item: ItemLike & { rid?: string; b?: boolean; price?: number }
    unitPrice: number
    quantity: number
    totalCost: number
}

export interface PontyEvaluationResult {
    itemsToBuy: PontyPurchaseItem[]
    totalCost: number
    remainingGold: number
    skippedDueToReserve: PontyPurchaseItem[]
    skippedDueToSpace: PontyPurchaseItem[]
}

export interface StandListingAction {
    type: "list"
    itemPos: number
    tradeSlot: TradeSlotType
    name: string
    price: number
    quantity: number
}

export interface StandDelistAction {
    type: "delist"
    tradeSlot: TradeSlotType
    name: string
}

export interface StandEvaluationResult {
    listingsToAdd: StandListingAction[]
    listingsToRemove: StandDelistAction[]
    activeListingsCount: number
    availableTradeSlots: TradeSlotType[]
}

export type StandStateDecision = "open" | "close" | "none"

export interface StandStateContext {
    isMoving: boolean
    hasCourierTrip: boolean
    isStandOpen: boolean
    hasStandItem: boolean
    inVendingLocation?: boolean
}

export interface MerchantTradeOptions {
    /** Minimum gold amount the merchant must keep in reserve when sniping Ponty (default: 100,000) */
    minGoldReserve?: number
    /** Trade slots available for player vending (default: trade1 - trade16) */
    allowedStandSlots?: TradeSlotType[]
    /** Item names that permit opening the merchant stand (default: stand0, stand1, computer, supercomputer) */
    standItemNames?: string[]
}

/**
 * Pure evaluation: determines which items to purchase from Ponty secondhand store,
 * respecting minimum gold reserve, item policy, and bag capacity.
 */
export function evaluatePontyPurchases(
    pontyItems: Array<ItemLike & { rid?: string; b?: boolean; price?: number }>,
    inventory: Array<ItemLike | null | undefined>,
    currentGold: number,
    catalog: ItemCatalog,
    gData: GData,
    options: {
        minGoldReserve?: number
        maxItemsToBuy?: number
    } = {},
): PontyEvaluationResult {
    const minReserve = options.minGoldReserve ?? 100_000
    let availableGold = currentGold
    let freeSlots = inventory.filter((i) => !i).length

    // Map remaining capacity in existing stackable items in inventory
    const stackCapacities = new Map<string, number>()
    for (const item of inventory) {
        if (!item) continue
        const gItem = gData.items[item.name as ItemName]
        if (gItem?.s && gItem.s > 1) {
            const currentQty = item.q ?? 1
            const remaining = Math.max(0, gItem.s - currentQty)
            if (remaining > 0) {
                const existing = stackCapacities.get(item.name) ?? 0
                stackCapacities.set(item.name, existing + remaining)
            }
        }
    }

    const itemsToBuy: PontyPurchaseItem[] = []
    const skippedDueToReserve: PontyPurchaseItem[] = []
    const skippedDueToSpace: PontyPurchaseItem[] = []

    for (const item of pontyItems) {
        // Skip buy requests listed by other players
        if (item.b === true) continue

        const policy = catalog[item.name]
        if (!shouldBuyFromPonty(policy, item, gData)) continue

        const gItem = gData.items[item.name as ItemName]
        const multiplier = gData.multipliers?.lostandfound_mult ?? gData.multipliers?.secondhands_mult ?? 4
        const npcValue = calculateItemNpcValue(item, gData)
        const unitPrice = item.price ?? Math.round(npcValue * multiplier)
        const quantity = item.q ?? 1
        const totalCost = unitPrice * quantity

        const candidate: PontyPurchaseItem = {
            item,
            unitPrice,
            quantity,
            totalCost,
        }

        // Gold reserve check
        if (availableGold - totalCost < minReserve) {
            skippedDueToReserve.push(candidate)
            continue
        }

        // Inventory capacity check
        let hasSpace = false
        const remainingStack = stackCapacities.get(item.name) ?? 0
        if (quantity <= remainingStack) {
            // Can stack into existing inventory slot
            stackCapacities.set(item.name, remainingStack - quantity)
            hasSpace = true
        } else if (freeSlots > 0) {
            // Needs a free inventory slot
            freeSlots--
            hasSpace = true
        }

        if (!hasSpace) {
            skippedDueToSpace.push(candidate)
            continue
        }

        itemsToBuy.push(candidate)
        availableGold -= totalCost

        if (options.maxItemsToBuy && itemsToBuy.length >= options.maxItemsToBuy) {
            break
        }
    }

    return {
        itemsToBuy,
        totalCost: currentGold - availableGold,
        remainingGold: availableGold,
        skippedDueToReserve,
        skippedDueToSpace,
    }
}

/**
 * Pure evaluation: determines which items from merchant inventory to list on the stand,
 * and which stale/unauthorized items to delist.
 */
export function evaluateStandListings(
    inventory: Array<ItemLike | null | undefined>,
    currentSlots: Partial<Record<string, any>>,
    catalog: ItemCatalog,
    gData: GData,
    options: {
        allowedSlots?: TradeSlotType[]
    } = {},
): StandEvaluationResult {
    const allowedSlots = options.allowedSlots ?? DEFAULT_STAND_SLOTS
    const listingsToAdd: StandListingAction[] = []
    const listingsToRemove: StandDelistAction[] = []
    const emptySlots: TradeSlotType[] = []
    let activeListingsCount = 0

    // 1. Analyze current stand slots: find empty slots and delist invalid items
    for (const slotKey of allowedSlots) {
        const current = currentSlots[slotKey]
        if (!current) {
            emptySlots.push(slotKey)
            continue
        }

        const policy = catalog[current.name]
        // Delist if item is no longer marked for listing, or is a buy request, or should be held
        if (!policy?.list || current.b === true || shouldHold(policy, current, "merchant")) {
            listingsToRemove.push({
                type: "delist",
                tradeSlot: slotKey,
                name: current.name,
            })
            // This slot will become available after unequip
            emptySlots.push(slotKey)
        } else {
            activeListingsCount++
        }
    }

    // 2. Scan inventory for items that should be listed on empty stand slots
    for (let itemPos = 0; itemPos < inventory.length; itemPos++) {
        if (emptySlots.length === 0) break

        const item = inventory[itemPos]
        if (!item || item.l || item.p) continue // Skip locked or special items

        const policy = catalog[item.name]
        if (!policy?.list) continue

        // Skip items the merchant is designated to hold for self/team
        if (shouldHold(policy, item, "merchant")) continue

        // Calculate listing price
        let price: number
        if (typeof policy.sellPrice === "number") {
            price = policy.sellPrice
        } else if (policy.sellPrice === "npc") {
            price = calculateItemNpcValue(item, gData)
        } else if (policy.sellPrice && typeof policy.sellPrice === "object") {
            price = policy.sellPrice[item.level ?? 0] ?? calculateItemNpcValue(item, gData) * 2
        } else {
            price = calculateItemNpcValue(item, gData) * 2
        }

        const tradeSlot = emptySlots.shift()!
        listingsToAdd.push({
            type: "list",
            itemPos,
            tradeSlot,
            name: item.name,
            price: Math.max(1, price),
            quantity: item.q ?? 1,
        })
    }

    return {
        listingsToAdd,
        listingsToRemove,
        activeListingsCount,
        availableTradeSlots: emptySlots,
    }
}

/**
 * Pure evaluation: computes the desired stand lifecycle state (open, close, or maintain).
 */
export function evaluateStandState(context: StandStateContext): {
    decision: StandStateDecision
    reason: string
} {
    // Stand MUST be closed when moving or delivering courier supplies
    if ((context.isMoving || context.hasCourierTrip) && context.isStandOpen) {
        return {
            decision: "close",
            reason: "Cannot keep merchant stand open while moving or fulfilling courier missions",
        }
    }

    // Stand SHOULD be opened when stationary in vending location and merchant has stand item
    if (
        !context.isMoving &&
        !context.hasCourierTrip &&
        !context.isStandOpen &&
        context.hasStandItem &&
        (context.inVendingLocation ?? true)
    ) {
        return {
            decision: "open",
            reason: "Stationary in vending area with stand equipment ready",
        }
    }

    return {
        decision: "none",
        reason: "Stand state matches current activity",
    }
}

/**
 * Merchant Trade Service: coordinates Ponty sniping, stand listing management,
 * and stand lifecycle synchronization.
 */
export class MerchantTradeService {
    private readonly minGoldReserve: number
    private readonly allowedSlots: TradeSlotType[]
    private readonly standItemNames: string[]

    public constructor(options: MerchantTradeOptions = {}) {
        this.minGoldReserve = options.minGoldReserve ?? 100_000
        this.allowedSlots = options.allowedStandSlots ?? DEFAULT_STAND_SLOTS
        this.standItemNames = options.standItemNames ?? DEFAULT_STAND_ITEMS
    }

    public evaluatePonty(
        pontyItems: Array<ItemLike & { rid?: string; b?: boolean; price?: number }>,
        inventory: Array<ItemLike | null | undefined>,
        currentGold: number,
        catalog: ItemCatalog,
        gData: GData,
        maxItems?: number,
    ): PontyEvaluationResult {
        return evaluatePontyPurchases(pontyItems, inventory, currentGold, catalog, gData, {
            minGoldReserve: this.minGoldReserve,
            maxItemsToBuy: maxItems,
        })
    }

    public evaluateStand(
        inventory: Array<ItemLike | null | undefined>,
        currentSlots: Partial<Record<string, any>>,
        catalog: ItemCatalog,
        gData: GData,
    ): StandEvaluationResult {
        return evaluateStandListings(inventory, currentSlots, catalog, gData, {
            allowedSlots: this.allowedSlots,
        })
    }

    public evaluateLifecycle(context: StandStateContext): {
        decision: StandStateDecision
        reason: string
    } {
        return evaluateStandState(context)
    }

    /**
     * Executes purchases for all approved Ponty items on the bot socket.
     */
    public async executePontyPurchases(bot: any, plan: PontyEvaluationResult): Promise<number> {
        let count = 0
        for (const candidate of plan.itemsToBuy) {
            try {
                await bot.buyFromPonty(candidate.item)
                count++
            } catch (err) {
                console.error(`Failed to buy ${candidate.item.name} from Ponty:`, err)
            }
        }
        return count
    }

    /**
     * Executes stand listing additions and removals on the bot socket.
     */
    public async executeStandUpdates(
        bot: any,
        plan: StandEvaluationResult,
    ): Promise<{ listed: number; delisted: number }> {
        let delisted = 0
        let listed = 0

        // Delist invalid/unwanted items first
        for (const action of plan.listingsToRemove) {
            try {
                await bot.unequip(action.tradeSlot)
                delisted++
            } catch (err) {
                console.error(`Failed to delist ${action.tradeSlot}:`, err)
            }
        }

        // List new eligible items
        for (const action of plan.listingsToAdd) {
            try {
                await bot.listForSale(
                    action.itemPos,
                    action.price,
                    action.tradeSlot,
                    action.quantity,
                )
                listed++
            } catch (err) {
                console.error(`Failed to list item at pos ${action.itemPos} in ${action.tradeSlot}:`, err)
            }
        }

        return { listed, delisted }
    }

    /**
     * Synchronizes stand open/closed state according to movement and courier activity.
     */
    public async syncStandState(
        bot: any,
        hasCourierTrip: boolean,
        inVendingLocation: boolean = true,
    ): Promise<StandStateDecision> {
        const isMoving = Boolean(bot.moving || bot.smartMoving)
        const isStandOpen = Boolean(bot.stand)
        const hasStandItem = typeof bot.hasItem === "function"
            ? bot.hasItem(this.standItemNames)
            : Boolean(bot.items?.some((i: any) => i && this.standItemNames.includes(i.name)))

        const evalResult = this.evaluateLifecycle({
            isMoving,
            hasCourierTrip,
            isStandOpen,
            hasStandItem,
            inVendingLocation,
        })

        if (evalResult.decision === "close" && typeof bot.closeMerchantStand === "function") {
            await bot.closeMerchantStand()
        } else if (evalResult.decision === "open" && typeof bot.openMerchantStand === "function") {
            await bot.openMerchantStand()
        }

        return evalResult.decision
    }
}
