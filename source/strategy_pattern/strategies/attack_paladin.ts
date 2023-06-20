import AL, { Entity, Paladin } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./attack.js"
import { suppress_errors } from "../logging.js"

export type PaladinAttackStrategyOptions = BaseAttackStrategyOptions & {
    disablePurify?: boolean
    disableSelfHeal?: boolean
    disableSmash?: boolean
}

export class PaladinAttackStrategy extends BaseAttackStrategy<Paladin> {
    public options: PaladinAttackStrategyOptions

    public constructor(options?: PaladinAttackStrategyOptions) {
        super(options)
    }

    protected async attack(bot: Paladin): Promise<void> {
        if (!this.options.disableSelfHeal) await this.selfHeal(bot)

        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot)
            return
        }

        const priority = this.sort.get(bot.id)

        await this.ensureEquipped(bot)

        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disablePurify) await this.purify(bot, priority).catch(suppress_errors)
        if (!this.options.disableSmash) await this.smash(bot, priority).catch(suppress_errors)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority).catch(suppress_errors)

        await this.ensureEquipped(bot)
    }

    protected async selfHeal(bot: Paladin): Promise<unknown> {
        if (!bot.canUse("selfheal")) return

        // Potentially heal ourself
        let healIfMissing = 0
        for (const [level, heal] of AL.Game.G.skills.selfheal.levels) {
            if (bot.level < level) break
            healIfMissing = heal
        }

        // Heal ourself if we're missing enough HP
        if (bot.max_hp - bot.hp > healIfMissing) return bot.selfHeal()
    }

    protected async purify(bot: Paladin, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("purify")) return // We can't purify

        if (this.options.enableGreedyAggro) {
            // purify an entity that doesn't have a target if we can
            const entities = bot.getEntities({
                canDamage: "purify",
                hasTarget: false,
                typeList: this.options.typeList,
                withinRange: "purify"
            })
            if (
                entities.length
                && !(this.options.maximumTargets && bot.targets >= this.options.maximumTargets)) {
                // Prioritize the entities
                const targets = new FastPriorityQueue<Entity>(priority)
                for (const entity of entities) targets.add(entity)

                return bot.purify(targets.peek().id).catch(console.error)
            }
        }

        if (bot.mp < AL.Game.G.skills.purify.mp * 2) return // Save the MP for use with normal attacks

        // Find all targets we want to purify
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "purify",
            withinRange: "purify"
        })
        if (entities.length == 0) return // No targets to purify

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't purify if it pushes us over our limit
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

            const canKill = bot.canKillInOneShot(target, "purify")
            if (canKill) this.preventOverkill(bot, target)
            else this.getEnergizeFromOther(bot)
            return bot.purify(target.id).catch(console.error)
        }
    }

    protected async smash(bot: Paladin, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("smash")) return // We can't smash

        if (this.options.enableGreedyAggro) {
            // Smash an entity that doesn't have a target if we can
            const entities = bot.getEntities({
                canDamage: "smash",
                hasTarget: false,
                typeList: this.options.typeList,
                withinRange: "smash"
            })
            if (
                entities.length
                && !(this.options.maximumTargets && bot.targets >= this.options.maximumTargets)) {
                // Prioritize the entities
                const targets = new FastPriorityQueue<Entity>(priority)
                for (const entity of entities) targets.add(entity)

                return bot.smash(targets.peek().id).catch(console.error)
            }
        }

        if (bot.mp < AL.Game.G.skills.smash.mp * 3) return // Save the MP for use with normal attacks

        // Find all targets we want to smash
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "smash",
            withinRange: "smash"
        })
        if (entities.length == 0) return // No targets to smash

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't smash if it pushes us over our limit
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

            const canKill = bot.canKillInOneShot(target, "smash")
            if (canKill) this.preventOverkill(bot, target)
            if (!canKill || targets.size > 0) this.getEnergizeFromOther(bot)
            return bot.smash(target.id).catch(console.error)
        }
    }
}