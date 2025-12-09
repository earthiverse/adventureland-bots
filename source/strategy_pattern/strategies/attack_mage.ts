import AL, { ActionData, ActionDataRay, Entity, Mage, SlotType, TradeItemInfo, TradeSlotType } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { suppress_errors } from "../logging.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions, KILL_STEAL_AVOID_MONSTERS } from "./attack.js"

export type MageAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableCburst?: boolean
}

export class MageAttackStrategy extends BaseAttackStrategy<Mage> {
    protected declare options: MageAttackStrategyOptions

    protected stealOnActionCburst: (data: ActionData) => void

    public constructor(options?: MageAttackStrategyOptions) {
        super(options)

        if (!this.options.disableCburst) this.interval.push("cburst")
    }

    public onApply(bot: Mage): void {
        super.onApply(bot)
        if (!this.options.disableCburst && !this.options.disableKillSteal) {
            this.stealOnActionCburst = (data: ActionData) => {
                // TODO: Improve for if we see 3shot or 5shot
                //       Maybe sleep for a few ms?
                if (!bot.canUse("cburst")) return
                if ((data as ActionDataRay).instant) return // We can't kill steal if the projectile is instant

                const attacker = bot.players.get(data.attacker)
                if (!attacker) return // Not a player
                if (attacker.isFriendly(bot)) return

                const target = bot.entities.get(data.target)
                if (!target) return // Not an entity
                if (target.target) return // Already has a target, can't steal
                if (target.immune) return // Can't damage with cburst
                if (KILL_STEAL_AVOID_MONSTERS.includes(target.type)) return // Want to avoid kill stealing these
                if (AL.Tools.distance(bot, target) > AL.Game.G.skills.zapperzap.range) return // Too far away to zap
                if (!target.willDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)) return // It won't die to projectiles

                // Cburst to try and kill steal the entity
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
        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot).catch(suppress_errors)
            return
        }

        const priority = this.botSort.get(bot.id)

        await this.ensureEquipped(bot).catch(console.error)

        if (!this.options.disableCburst) {
            await this.cburstHumanoids(bot).catch(suppress_errors)
            await this.cburstAttack(bot, priority).catch(suppress_errors)
        }
        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority).catch(suppress_errors)
        // TODO: Idle cburst

        await this.ensureEquipped(bot).catch(console.error)
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
            withinRange: "cburst",
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

        return await bot.cburst([...targets.entries()])
    }

    protected async cburstAttack(bot: Mage, priority: (a: Entity, b: Entity) => boolean) {
        if (!bot.canUse("cburst")) return

        // Allow half of our MP to go to killing monsters with cburst

        let mpPool = bot.mp - AL.Game.G.skills.cburst.mp - bot.max_mp / 2
        if (mpPool <= 0) return

        const toCburst = new Map<string, number>()
        if (this.options.enableGreedyAggro) {
            const entities = bot.getEntities({
                canDamage: "cburst",
                hasTarget: false,
                typeList: Array.isArray(this.options.enableGreedyAggro)
                    ? this.options.enableGreedyAggro
                    : this.options.typeList,
                withinRange: "cburst",
            })
            if (entities.length && !(this.options.maximumTargets && bot.targets >= this.options.maximumTargets)) {
                // Prioritize the entities
                for (const entity of entities) {
                    if (mpPool - 5 < 0) break // Not enough MP
                    mpPool -= 5
                    toCburst.set(entity.id, 5)
                }
            }
        }

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "cburst",
            withinRange: "cburst",
            couldDieToProjectiles: false,
        })

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        // Look for everything we can kill in one shot with cburst
        targets.forEach((entity) => {
            const mpNeededToKill =
                ((entity.hp * 1.1) / AL.Game.G.skills.cburst.ratio) *
                AL.Tools.damage_multiplier(bot.rpiercing - entity.resistance)
            if (mpNeededToKill > mpPool) return // Not enough MP
            if (toCburst.has(entity.id)) {
                mpPool += toCburst.get(entity.id)
                toCburst.set(entity.id, mpNeededToKill)
            } else {
                toCburst.set(entity.id, mpNeededToKill)
            }
            this.preventOverkill(bot, entity)
            mpPool -= mpNeededToKill
        })

        // Look for a single target to spend mp attacking
        if (bot.mp > bot.max_mp - 500 && mpPool >= 0) {
            while (targets.size) {
                const target = targets.poll()
                if (target.willDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)) continue
                if (toCburst.has(target.id)) continue // Already cbursting

                // Use the rest of our pool (if we were to kill it, it would have already been set in toCburst)
                toCburst.set(target.id, mpPool)
                break
            }
        }

        if (toCburst.size == 0) return // No targets to attack

        // cburst everything in our list
        return await bot.cburst([...toCburst.entries()])
    }
}
