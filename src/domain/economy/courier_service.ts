import type { GData, ItemName, MapName } from "alclient"
import type { BotStatus, TeamBlackboard } from "../../core/blackboard/team_blackboard.js"
import type { ItemLike } from "../items/item_queries.js"

export interface CourierOptions {
    /** Minimum free inventory slots below which a party member is flagged for loot collection (default: 3) */
    lootCollectionFreeSlotsThreshold?: number
    /** Target gold amount to leave on combat bots; excess will be collected (default: 50,000) */
    combatBotGoldToHold?: number
    /** Interaction distance limit for deliveries/loot (default: 250) */
    interactionDistance?: number
}

export interface SupplyDeliveryItem {
    item: ItemName
    quantity: number
}

export interface SupplyDeliveryPlan {
    deliveries: Map<string, SupplyDeliveryItem[]>
    itemsToBuy: Array<{ item: ItemName; quantity: number; cost: number }>
    totalCost: number
    canAfford: boolean
}

export interface LootCollectionCandidate {
    botName: string
    map: MapName
    x: number
    y: number
    freeSlots: number
    excessGold: number
    urgency: "critical" | "high" | "normal"
}

export interface CourierWaypoint {
    botName: string
    map: MapName
    x: number
    y: number
    deliveries: SupplyDeliveryItem[]
    collectLoot: boolean
    excessGoldToCollect: number
    urgency: "critical" | "high" | "normal"
}

export class CourierService {
    private readonly lootFreeSlotsThreshold: number
    private readonly combatBotGoldToHold: number

    public constructor(options: CourierOptions = {}) {
        this.lootFreeSlotsThreshold = options.lootCollectionFreeSlotsThreshold ?? 3
        this.combatBotGoldToHold = options.combatBotGoldToHold ?? 50_000
    }

    /**
     * Evaluates supply needs from the blackboard against merchant inventory and gold.
     * Computes what needs to be bought from NPCs vs what is already on hand.
     */
    public evaluateSupplyDeliveries(
        blackboard: TeamBlackboard,
        merchantInventory: ItemLike[],
        merchantGold: number,
        gData: GData,
    ): SupplyDeliveryPlan {
        const supplyNeeds = blackboard.getSupplyNeeds()
        const deliveries = new Map<string, SupplyDeliveryItem[]>()

        // Count merchant's existing stock
        const merchantStock = new Map<string, number>()
        for (const item of merchantInventory) {
            if (!item) continue
            const current = merchantStock.get(item.name) ?? 0
            merchantStock.set(item.name, current + (item.q ?? 1))
        }

        const totalNeededPerItem = new Map<ItemName, number>()

        // Group needs per bot
        for (const need of supplyNeeds) {
            if (!deliveries.has(need.botName)) {
                deliveries.set(need.botName, [])
            }
            deliveries.get(need.botName)!.push({
                item: need.item,
                quantity: need.quantity,
            })

            const neededSoFar = totalNeededPerItem.get(need.item) ?? 0
            totalNeededPerItem.set(need.item, neededSoFar + need.quantity)
        }

        // Calculate what merchant must buy from vendor
        const itemsToBuy: Array<{ item: ItemName; quantity: number; cost: number }> = []
        let totalCost = 0

        for (const [itemName, totalNeeded] of totalNeededPerItem) {
            const onHand = merchantStock.get(itemName) ?? 0
            const shortfall = Math.max(0, totalNeeded - onHand)

            if (shortfall > 0) {
                const gItem = gData.items[itemName]
                const unitPrice = gItem?.g ?? 100
                const cost = shortfall * unitPrice
                totalCost += cost
                itemsToBuy.push({
                    item: itemName,
                    quantity: shortfall,
                    cost,
                })
            }
        }

        return {
            deliveries,
            itemsToBuy,
            totalCost,
            canAfford: merchantGold >= totalCost,
        }
    }

    /**
     * Scans team members to find who needs their inventory cleared or excess gold collected.
     */
    public evaluateLootCollections(
        blackboard: TeamBlackboard,
        merchantFreeSlots: number,
    ): LootCollectionCandidate[] {
        if (merchantFreeSlots <= 0) return []

        const candidates: LootCollectionCandidate[] = []
        const members = blackboard.getAllMembers()

        for (const member of members) {
            if (member.type === "merchant") continue // Don't offload to self

            const freeSlots = member.freeInventorySlots
            const excessGold = Math.max(0, member.gold - this.combatBotGoldToHold)

            const needsInventoryClear = freeSlots <= this.lootFreeSlotsThreshold
            const hasExcessGold = excessGold >= 50_000

            if (needsInventoryClear || hasExcessGold) {
                let urgency: "critical" | "high" | "normal" = "normal"
                if (freeSlots === 0) urgency = "critical"
                else if (freeSlots <= 2) urgency = "high"

                candidates.push({
                    botName: member.name,
                    map: member.map,
                    x: member.x,
                    y: member.y,
                    freeSlots,
                    excessGold,
                    urgency,
                })
            }
        }

        // Sort: critical urgency first, then fewest free slots
        candidates.sort((a, b) => {
            const rank = { critical: 3, high: 2, normal: 1 }
            if (rank[b.urgency] !== rank[a.urgency]) {
                return rank[b.urgency] - rank[a.urgency]
            }
            return a.freeSlots - b.freeSlots
        })

        return candidates
    }

    /**
     * Consolidates supply deliveries and loot collections into an optimized itinerary.
     */
    public planCourierTrip(
        blackboard: TeamBlackboard,
        merchantInventory: ItemLike[],
        merchantGold: number,
        merchantFreeSlots: number,
        gData: GData,
    ): CourierWaypoint[] {
        const supplyPlan = this.evaluateSupplyDeliveries(blackboard, merchantInventory, merchantGold, gData)
        const lootCandidates = this.evaluateLootCollections(blackboard, merchantFreeSlots)

        const waypointMap = new Map<string, CourierWaypoint>()
        const members = blackboard.getAllMembers()
        const memberMap = new Map<string, BotStatus>(members.map((m) => [m.name, m]))

        // Add delivery stops
        for (const [botName, deliveries] of supplyPlan.deliveries) {
            const status = memberMap.get(botName)
            if (!status) continue

            waypointMap.set(botName, {
                botName,
                map: status.map,
                x: status.x,
                y: status.y,
                deliveries,
                collectLoot: false,
                excessGoldToCollect: 0,
                urgency: "normal",
            })
        }

        // Merge or add loot collection stops
        for (const candidate of lootCandidates) {
            const existing = waypointMap.get(candidate.botName)
            if (existing) {
                existing.collectLoot = true
                existing.excessGoldToCollect = candidate.excessGold
                if (candidate.urgency === "critical" || existing.urgency === "normal") {
                    existing.urgency = candidate.urgency
                }
            } else {
                waypointMap.set(candidate.botName, {
                    botName: candidate.botName,
                    map: candidate.map,
                    x: candidate.x,
                    y: candidate.y,
                    deliveries: [],
                    collectLoot: true,
                    excessGoldToCollect: candidate.excessGold,
                    urgency: candidate.urgency,
                })
            }
        }

        const waypoints = Array.from(waypointMap.values())

        // Sort: Critical urgency first, then high, then normal
        waypoints.sort((a, b) => {
            const rank = { critical: 3, high: 2, normal: 1 }
            return rank[b.urgency] - rank[a.urgency]
        })

        return waypoints
    }
}
