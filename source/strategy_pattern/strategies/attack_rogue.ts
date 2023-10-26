import AL, { Entity, Rogue } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { sortHighestHpFirst } from "../../base/sort.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions, KILL_STEAL_AVOID_MONSTERS } from "./attack.js"
import { suppress_errors } from "../logging.js"

export type RogueAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableMentalBurst?: boolean
    disableQuickPunch?: boolean
    disableQuickStab?: boolean
}

export class RogueAttackStrategy extends BaseAttackStrategy<Rogue> {
    public options: RogueAttackStrategyOptions

    public constructor(options?: RogueAttackStrategyOptions) {
        super(options)

        if (!this.options.disableMentalBurst) this.interval.push("mentalburst")
        if (!this.options.disableQuickPunch) this.interval.push("quickpunch")
        if (!this.options.disableQuickStab) this.interval.push("quickstab")
    }

    protected async attack(bot: Rogue) {
        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot).catch(suppress_errors)
            return
        }

        const priority = this.botSort.get(bot.id)

        await this.ensureEquipped(bot)

        if (!this.options.disableMentalBurst) await this.mentalBurstForRegen(bot).catch(suppress_errors)
        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableMentalBurst) await this.mentalBurstForRegen(bot).catch(suppress_errors)
        if (!this.options.disableMentalBurst) await this.mentalBurstForDamage(bot, priority).catch(suppress_errors)
        if (!this.options.disableQuickPunch) await this.quickPunch(bot, priority).catch(suppress_errors)
        if (!this.options.disableMentalBurst) await this.mentalBurstForRegen(bot).catch(suppress_errors)
        if (!this.options.disableQuickStab) await this.quickStab(bot, priority).catch(suppress_errors)
        if (!this.options.disableMentalBurst) await this.mentalBurstForRegen(bot).catch(suppress_errors)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableMentalBurst) await this.mentalBurstForRegen(bot).catch(suppress_errors)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableMentalBurst) await this.mentalBurstForRegen(bot).catch(suppress_errors)

        await this.ensureEquipped(bot)
    }

    /**
     * Mental burst if we can kill something to get extra MP
     * @param bot
     * @returns
     */
    protected async mentalBurstForRegen(bot: Rogue) {
        if (!bot.canUse("mentalburst")) return // We can't mentalburst

        const entities = bot.getEntities({
            canDamage: "mentalburst",
            canKillInOneShot: "mentalburst",
            couldGiveCredit: true,
            notTypeList: KILL_STEAL_AVOID_MONSTERS,
            withinRange: "mentalburst"
        })
        if (entities.length) {
            // We can kill something with mentalburst, which will give us extra mp. Sort highest hp first to get the most MP
            const targets = new FastPriorityQueue<Entity>(sortHighestHpFirst)
            for (const entity of entities) targets.add(entity)

            const target = targets.peek()

            this.preventOverkill(bot, target)
            return bot.mentalBurst(target.id)
        }
    }

    /**
     * Mental burst for extra damage
     * 
     * @param bot 
     * @param priority 
     * @returns 
     */
    protected async mentalBurstForDamage(bot: Rogue, priority: (a: Entity, b: Entity) => boolean) {
        if (this.options.enableGreedyAggro) {
            // Mental burst an entity that doesn't have a target if we can
            const entities = bot.getEntities({
                canDamage: "mentalburst",
                hasTarget: false,
                typeList: this.options.typeList,
                withinRange: "mentalburst"
            })
            if (
                entities.length
                && !(this.options.maximumTargets && bot.targets >= this.options.maximumTargets)
            ) {
                // Prioritize the entities
                const targets = new FastPriorityQueue<Entity>(priority)
                for (const entity of entities) targets.add(entity)

                const target = targets.peek()
                if (bot.canKillInOneShot(target, "mentalburst")) this.preventOverkill(bot, target)
                return bot.mentalBurst(target.id)
            }
        }

        if (bot.mp < AL.Game.G.skills.mentalburst.mp * 2) return // Save the MP for use with normal attacks for rogue stack

        // Find all targets we want to mental burst
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "mentalburst",
            withinRange: "mentalburst"
        })
        if (entities.length == 0) return // No targets to mental burst

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't mental burst if it pushes us over our limit
                if (bot.targets >= this.options.maximumTargets) continue // We don't want another target
                switch (target.damage_type) {
                    case "magical":
                        if (bot.mcourage <= targetingMe.magical) continue // We can't tank any more magical monsters
                        break
                    case "physical":
                        if (bot.courage <= targetingMe.physical) continue // We can't tank any more physical monsters
                        break
                    case "pure":
                        if (bot.courage <= targetingMe.pure) continue // We can't tank any more pure monsters
                        break
                }
            }

            return bot.mentalBurst(target.id)
        }
    }

    protected async quickPunch(bot: Rogue, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("quickpunch")) return // We can't quick punch

        if (this.options.enableGreedyAggro) {
            // Quick punch an entity that doesn't have a target if we can
            const entities = bot.getEntities({
                canDamage: "quickpunch",
                hasTarget: false,
                typeList: this.options.typeList,
                withinRange: "quickpunch"
            })
            if (
                entities.length
                && !(this.options.maximumTargets && bot.targets >= this.options.maximumTargets)
            ) {
                // Prioritize the entities
                const targets = new FastPriorityQueue<Entity>(priority)
                for (const entity of entities) targets.add(entity)

                const target = targets.peek()
                const canKill = bot.canKillInOneShot(target, "quickpunch")
                if (canKill) this.preventOverkill(bot, target)
                return bot.quickPunch(target.id)
            }
        }

        if (bot.mp < AL.Game.G.skills.quickpunch.mp * 2) return // Save the MP for use with normal attacks for rogue stack

        // Find all targets we want to quick punch
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "quickpunch",
            withinRange: "quickpunch"
        })
        if (entities.length == 0) return // No targets to quick punch

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't quick punch if it pushes us over our limit
                if (bot.targets >= this.options.maximumTargets) continue // We don't want another target
                switch (target.damage_type) {
                    case "magical":
                        if (bot.mcourage <= targetingMe.magical) continue // We can't tank any more magical monsters
                        break
                    case "physical":
                        if (bot.courage <= targetingMe.physical) continue // We can't tank any more physical monsters
                        break
                    case "pure":
                        if (bot.courage <= targetingMe.pure) continue // We can't tank any more pure monsters
                        break
                }
            }

            const canKill = bot.canKillInOneShot(target, "quickpunch")
            if (canKill) this.preventOverkill(bot, target)
            if (!canKill || targets.size > 0) this.getEnergizeFromOther(bot).catch(suppress_errors)
            return bot.quickPunch(target.id)
        }
    }

    protected async quickStab(bot: Rogue, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("quickstab")) return // We can't quick stab

        if (this.options.enableGreedyAggro) {
            // Quick stab an entity that doesn't have a target if we can
            const entities = bot.getEntities({
                canDamage: "quickstab",
                hasTarget: false,
                typeList: this.options.typeList,
                withinRange: "quickstab"
            })
            if (
                entities.length
                && !(this.options.maximumTargets && bot.targets >= this.options.maximumTargets)) {
                // Prioritize the entities
                const targets = new FastPriorityQueue<Entity>(priority)
                for (const entity of entities) targets.add(entity)

                const target = targets.peek()
                const canKill = bot.canKillInOneShot(target, "quickstab")
                if (canKill) this.preventOverkill(bot, target)
                return bot.quickStab(target.id)
            }
        }

        if (bot.mp < AL.Game.G.skills.quickstab.mp * 2) return // Save the MP for use with normal attacks for rogue stack

        // Find all targets we want to quick stab
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "quickstab",
            withinRange: "quickstab"
        })
        if (entities.length == 0) return // No targets to quick stab

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't quick stab if it pushes us over our limit
                if (bot.targets >= this.options.maximumTargets) continue // We don't want another target
                switch (target.damage_type) {
                    case "magical":
                        if (bot.mcourage <= targetingMe.magical) continue // We can't tank any more magical monsters
                        break
                    case "physical":
                        if (bot.courage <= targetingMe.physical) continue // We can't tank any more physical monsters
                        break
                    case "pure":
                        if (bot.courage <= targetingMe.pure) continue // We can't tank any more pure monsters
                        break
                }
            }

            const canKill = bot.canKillInOneShot(target, "quickstab")
            if (canKill) this.preventOverkill(bot, target)
            if (!canKill || targets.size > 0) this.getEnergizeFromOther(bot).catch(suppress_errors)
            return bot.quickStab(target.id)
        }
    }
}