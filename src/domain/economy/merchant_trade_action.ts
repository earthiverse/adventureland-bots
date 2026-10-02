import type { GData, PingCompensatedCharacter } from "alclient"
import type { Action, ActionContext } from "../../core/actions/action.js"
import type { ItemCatalog } from "../items/item_schema.js"
import { activeItemCatalog } from "../items/configs/index.js"
import {
    DEFAULT_STAND_ITEMS,
    MerchantTradeService,
    type MerchantTradeOptions,
    type PontyEvaluationResult,
    type StandEvaluationResult,
} from "./merchant_trade_service.js"

export interface MerchantTradeActionOptions extends MerchantTradeOptions {
    gData?: GData
    catalog?: ItemCatalog
    /** Permitted vending maps (default: ["main"]) */
    vendingMaps?: string[]
}

export class MerchantTradeAction implements Action<PingCompensatedCharacter> {
    public readonly name = "MerchantTradeAction"

    private readonly service: MerchantTradeService
    private readonly catalog: ItemCatalog
    private readonly gData?: GData
    private readonly vendingMaps: string[]
    private readonly standItemNames: string[]

    public constructor(options: MerchantTradeActionOptions = {}) {
        this.service = new MerchantTradeService(options)
        this.catalog = options.catalog ?? activeItemCatalog
        this.gData = options.gData
        this.vendingMaps = options.vendingMaps ?? ["main"]
        this.standItemNames = options.standItemNames ?? DEFAULT_STAND_ITEMS
    }

    public canExecute(bot: any, _context: ActionContext): boolean {
        if (!bot) return false
        if (bot.ctype !== "merchant") return false
        if (bot.rip) return false
        if (bot.ready === false) return false
        return true
    }

    public score(bot: any, context: ActionContext): number {
        if (!this.canExecute(bot, context)) return 0

        const isMoving = Boolean(bot.moving || bot.smartMoving)
        const isStandOpen = Boolean(bot.stand)

        // 1. Emergency stand closure: stand open while moving
        if (isStandOpen && isMoving) {
            return 95
        }

        // 2. Courier mission priority check
        const supplyNeeds = context.blackboard?.getSupplyNeeds() ?? []
        const members = context.blackboard?.getAllMembers() ?? []
        const hasCourierNeed = supplyNeeds.length > 0 || members.some((m) => m.freeInventorySlots <= 3)

        if (hasCourierNeed) {
            // If stand is open, we must close it first so we can embark on the courier trip
            if (isStandOpen) {
                return 90
            }
            // If stand is already closed, yield to CourierService
            return 0
        }

        // 3. Location check: only trade/vend in designated market maps
        const inVendingMap = this.vendingMaps.includes(bot.map)
        if (!inVendingMap) {
            if (isStandOpen) return 90 // Close stand if outside market
            return 0
        }

        const gData = this.gData ?? bot.G
        if (!gData) return 0

        // 4. Ponty Sniping Evaluation (Score: 65)
        const pontyItems = bot.pontyItems ?? []
        if (pontyItems.length > 0) {
            const pontyPlan: PontyEvaluationResult = this.service.evaluatePonty(
                pontyItems,
                bot.items ?? [],
                bot.gold ?? 0,
                this.catalog,
                gData,
            )
            if (pontyPlan.itemsToBuy.length > 0) {
                return 65
            }
        }

        // 5. Stand Maintenance & Lifecycle Evaluation (Score: 35)
        const hasStandItem = typeof bot.hasItem === "function"
            ? bot.hasItem(this.standItemNames)
            : Boolean(bot.items?.some((i: any) => i && this.standItemNames.includes(i.name)))

        const lifecycle = this.service.evaluateLifecycle({
            isMoving,
            hasCourierTrip: false,
            isStandOpen,
            hasStandItem,
            inVendingLocation: true,
        })

        if (lifecycle.decision !== "none") {
            return 35
        }

        const standPlan: StandEvaluationResult = this.service.evaluateStand(
            bot.items ?? [],
            bot.slots ?? {},
            this.catalog,
            gData,
        )

        if (standPlan.listingsToAdd.length > 0 || standPlan.listingsToRemove.length > 0) {
            return 35
        }

        return 0
    }

    public async execute(bot: any, context: ActionContext): Promise<boolean | void> {
        const isMoving = Boolean(bot.moving || bot.smartMoving)
        const isStandOpen = Boolean(bot.stand)

        // Handle immediate stand closure if moving
        if (isStandOpen && isMoving) {
            if (typeof bot.closeMerchantStand === "function") {
                await bot.closeMerchantStand()
            }
            return true
        }

        // Handle stand closure if courier supplies are urgently required
        const supplyNeeds = context.blackboard?.getSupplyNeeds() ?? []
        const members = context.blackboard?.getAllMembers() ?? []
        const hasCourierNeed = supplyNeeds.length > 0 || members.some((m) => m.freeInventorySlots <= 3)

        if (hasCourierNeed && isStandOpen) {
            if (typeof bot.closeMerchantStand === "function") {
                await bot.closeMerchantStand()
            }
            return true
        }

        const gData = this.gData ?? bot.G
        if (!gData) return false

        // 1. Sniping Ponty items
        const pontyItems = bot.pontyItems ?? (typeof bot.getPontyItems === "function" ? await bot.getPontyItems().catch(() => []) : [])
        if (pontyItems && pontyItems.length > 0) {
            const pontyPlan = this.service.evaluatePonty(
                pontyItems,
                bot.items ?? [],
                bot.gold ?? 0,
                this.catalog,
                gData,
            )
            if (pontyPlan.itemsToBuy.length > 0) {
                await this.service.executePontyPurchases(bot, pontyPlan)
            }
        }

        // 2. Stand listings maintenance (delist stale items, list eligible inventory)
        const standPlan = this.service.evaluateStand(
            bot.items ?? [],
            bot.slots ?? {},
            this.catalog,
            gData,
        )
        if (standPlan.listingsToRemove.length > 0 || standPlan.listingsToAdd.length > 0) {
            await this.service.executeStandUpdates(bot, standPlan)
        }

        // 3. Synchronize stand open state
        const inVendingMap = this.vendingMaps.includes(bot.map)
        await this.service.syncStandState(bot, hasCourierNeed, inVendingMap)

        return true
    }
}
