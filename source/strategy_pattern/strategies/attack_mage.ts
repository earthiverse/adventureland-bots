import AL, { ActionData, ActionDataRay, Mage, SlotType, TradeItemInfo, TradeSlotType } from "alclient"
import { sortPriority } from "../../base/sort.js"
import { suppress_errors } from "../logging.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions, KILL_STEAL_AVOID_MONSTERS } from "./attack.js"

export type MageAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableCburst?: boolean
}

export class MageAttackStrategy extends BaseAttackStrategy<Mage> {
    protected options: MageAttackStrategyOptions

    protected stealOnActionCburst: (data: ActionData) => Promise<unknown>

    public constructor(options?: MageAttackStrategyOptions) {
        super(options)

        if (!this.options.disableCburst) this.interval.push("cburst")
    }

    public onApply(bot: Mage): void {
        super.onApply(bot)
        if (!this.options.disableCburst && !this.options.disableKillSteal) {
            this.stealOnActionCburst = async (data: ActionData) => {
                // TODO: Improve for if we see 3shot or 5shot
                //       Maybe sleep for a few ms?
                if (!bot.canUse("zapperzap")) return
                if ((data as ActionDataRay).instant) return // We can't kill steal if the projectile is instant

                const attacker = bot.players.get(data.attacker)
                if (!attacker) return // Not a player

                const target = bot.entities.get(data.target)
                if (!target) return // Not an entity
                if (target.target) return // Already has a target, can't steal
                if (target.immune) return // Can't damage with zapper
                if (KILL_STEAL_AVOID_MONSTERS.includes(target.type)) return // Want to avoid kill stealing these
                if (AL.Tools.distance(bot, target) > AL.Game.G.skills.zapperzap.range) return // Too far away to zap
                if (!target.willDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)) return // It won't die to projectiles

                // Zap to try and kill steal the entity
                this.preventOverkill(bot, target)
                bot.cburst([[data.target, 5]]).catch(suppress_errors)
            }
            bot.socket.on("action", this.stealOnActionCburst)
        }
    }

    public onRemove(bot: Mage) {
        super.onRemove(bot)
        if (this.stealOnActionCburst) bot.socket.removeListener("action", this.stealOnActionCburst)
    }

    protected async attack(bot: Mage): Promise<void> {
        if (!this.shouldAttack(bot)) return

        const priority = sortPriority(bot, this.options.typeList)

        await this.ensureEquipped(bot)

        if (!this.options.disableCburst) await this.cburstHumanoids(bot)
        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority)

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
     * TODO: Move this to a listener on action
     */
    protected async cburstKillSteal(bot: Mage): Promise<void> {
        if (!bot.canUse("cburst")) return

        const targets = new Map<string, number>()

        this.options.canDamage = "cburst"
        this.options.withinRange = "cburst"
    }
}