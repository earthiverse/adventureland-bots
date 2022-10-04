import { Mage, SlotType, TradeItemInfo, TradeSlotType } from "alclient"
import { sortPriority } from "../../base/sort.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./attack.js"

export type MageAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableCburst?: boolean
    disableCburstKillSteal?: boolean
}

export class MageAttackStrategy extends BaseAttackStrategy<Mage> {
    protected options: MageAttackStrategyOptions

    public constructor(options?: MageAttackStrategyOptions) {
        super(options)

        if (!this.options.disableCburst) this.interval.push("cburst")
    }

    protected async attack(bot: Mage): Promise<void> {
        if (!this.shouldAttack(bot)) return

        const priority = sortPriority(bot, this.options.typeList)

        await this.ensureEquipped(bot)

        if (!this.options.disableCburst) await this.cburstHumanoids(bot)
        await this.basicAttack(bot, priority)

        await this.ensureEquipped(bot)
    }

    /**
     * If we have enough `restore_mp`, attacking a humanoid monster
     * will statistically give us more MP than it costs, so we can
     * use `cburst` to regenerate some mp.
     */
    protected async cburstHumanoids(bot: Mage) {
        if (!bot.canUse("cburst")) return

        const targets = new Map<string, number>()

        // Check if we have enough restorability
        let humanoidRestorability = 0
        for (const slotName in bot.slots) {
            const slot = bot.slots[slotName as SlotType | TradeSlotType]
            if (!slot || (slot as TradeItemInfo).price != undefined) continue
            const gItem = bot.G.items[slot.name]
            if (gItem.ability == "restore_mp") {
                humanoidRestorability += gItem.attr0 * 5
            }
        }
        // TODO: What is this 100 / 3? I forget...
        if (humanoidRestorability <= 100 / 3) return

        const entities = bot.getEntities({
            ...this.options,
            canDamage: "cburst",
            withinRange: "cburst"
        })
        let mpNeeded = bot.G.skills.cburst.mp + bot.mp_cost
        for (const entity of entities) {
            if (!entity.humanoid) continue // Entity isn't a humanoid
            if (targets.has(entity.id)) continue // It's low HP (from previous for loop), we're already going to kill it

            const extraMP = 100
            if (mpNeeded + extraMP > bot.mp) break // We can't cburst anything more
            targets.set(entity.id, extraMP)
            mpNeeded += extraMP
        }

        await bot.cburst([...targets.entries()])
    }

    /**
     * If there are projectiles going to monsters that don't have a target,
     * we can use `cburst` which immediately casts to steal the kill.
     *
     * TODO: Move this to a listener on projectiles
     */
    protected async cburstKillSteal(bot: Mage): Promise<void> {
        if (!bot.canUse("cburst")) return

        const targets = new Map<string, number>()

        this.options.canDamage = "cburst"
        this.options.withinRange = "cburst"
    }
}