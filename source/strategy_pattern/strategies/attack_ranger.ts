import AL, { Entity, Ranger } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { sortPriority } from "../../base/sort.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./attack.js"

export type RangerAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableHuntersMark?: boolean
    disableMultiShot?: boolean
    disableSuperShot?: boolean
}

export class RangerAttackStrategy extends BaseAttackStrategy<Ranger> {
    public options: RangerAttackStrategyOptions

    public constructor(options?: RangerAttackStrategyOptions) {
        super(options)

        if (!this.options.disableSuperShot) this.interval.push("supershot")
    }

    protected async attack(bot: Ranger) {
        const priority = sortPriority(bot, this.options.typeList)

        await this.ensureEquipped(bot)

        await this.multiAttack(bot, priority)
        if (!this.options.disableSuperShot) await this.supershot(bot, priority)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority)

        await this.ensureEquipped(bot)
    }

    protected async multiAttack(bot: Ranger, priority: (a: Entity, b: Entity) => boolean) {
        if (!bot.canUse("attack")) return

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "attack",
            withinRange: "attack"
        })
        if (entities.length == 0) return // No targets to attack

        const targetingMe = bot.calculateTargets()
        const targets = new FastPriorityQueue<Entity>(priority)
        const threeShotTargets = new FastPriorityQueue<Entity>(priority)
        const fiveShotTargets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) {
            targets.add(entity)

            if (this.options.disableMultiShot) continue
            if (entity.target) {
                // It has a target, we can attack it without gaining additional fear
                threeShotTargets.add(entity)
                fiveShotTargets.add(entity)
                continue
            }

            // Check if we can kill it in one hit without gaining additional fear
            let addedToThreeShotTargets = false // This flag will help us prevent adding them twice
            if (entity.hp <= bot.calculateDamageRange(bot, "5shot")[0]) {
                fiveShotTargets.add(entity)
                threeShotTargets.add(entity)
                continue
            } else if (entity.hp <= bot.calculateDamageRange(bot, "3shot")[0]) {
                threeShotTargets.add(entity)
                addedToThreeShotTargets = true
            }

            if (this.options.maximumTargets <= targetingMe.magical + targetingMe.physical + targetingMe.pure) continue // We want to limit our number of targets
            switch (entity.damage_type) {
                case "magical":
                    if (bot.mcourage > targetingMe.magical) {
                        // We can tank one more magical monster
                        if (!addedToThreeShotTargets) threeShotTargets.add(entity)
                        fiveShotTargets.add(entity)
                        targetingMe.magical += 1
                        continue
                    }
                    break
                case "physical":
                    if (bot.courage > targetingMe.physical) {
                        // We can tank one more physical monster
                        if (!addedToThreeShotTargets)threeShotTargets.add(entity)
                        fiveShotTargets.add(entity)
                        targetingMe.physical += 1
                        continue
                    }
                    break
                case "pure":
                    if (bot.pcourage > targetingMe.pure) {
                        // We can tank one more pure monster
                        if (!addedToThreeShotTargets)threeShotTargets.add(entity)
                        fiveShotTargets.add(entity)
                        targetingMe.pure += 1
                        continue
                    }
                    break
            }
        }

        if (!this.options.disableHuntersMark) this.applyHuntersMark(bot, targets.peek())

        if (!this.options.disableMultiShot && fiveShotTargets.size >= 5 && bot.canUse("5shot")) {
            const entities: Entity[] = []
            while (entities.length < 5) {
                const entity = fiveShotTargets.poll()
                entities.push(entity)
                if (bot.canKillInOneShot(entity, "5shot")) this.preventOverkill(bot, entity)
            }

            this.getEnergizeFromOther(bot)
            return bot.fiveShot(entities[0].id, entities[1].id, entities[2].id, entities[3].id, entities[4].id).catch(console.error)
        } else if (!this.options.disableMultiShot && threeShotTargets.size >= 3 && bot.canUse("3shot")) {
            const entities: Entity[] = []
            while (entities.length < 3) {
                const entity = threeShotTargets.poll()
                entities.push(entity)
                if (bot.canKillInOneShot(entity, "3shot")) this.preventOverkill(bot, entity)
            }

            this.getEnergizeFromOther(bot)
            return bot.threeShot(entities[0].id, entities[1].id, entities[2].id).catch(console.error)
        }

        const canUsePiercingShot = bot.canUse("piercingshot")
        while (targets.size) {
            const entity = targets.poll()

            if (bot.canKillInOneShot(entity)) {
                this.preventOverkill(bot, entity)
                this.getEnergizeFromOther(bot)
                return bot.basicAttack(entity.id).catch(console.error)
            }

            if (canUsePiercingShot && bot.canKillInOneShot(entity, "piercingshot")) {
                this.preventOverkill(bot, entity)
                this.getEnergizeFromOther(bot)
                return bot.piercingShot(entity.id).catch(console.error)
            }

            if (!entity.target) {
                // We're going to be tanking this monster, don't attack if it pushes us over our limit
                if (bot.targets >= this.options.maximumTargets) continue // We don't want another target
                switch (entity.damage_type) {
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

            if (!canUsePiercingShot) {
                this.getEnergizeFromOther(bot)
                return bot.basicAttack(entity.id).catch(console.error)
            }

            // Use the attack that will do more damage
            const damage = bot.calculateDamageRange(entity)
            const piercingDamage = bot.canUse("piercingshot") ? bot.calculateDamageRange(entity, "piercingshot") : [0, 0]
            this.getEnergizeFromOther(bot)
            if (damage[0] >= piercingDamage[0]) return bot.basicAttack(entity.id).catch(console.error)
            else return bot.piercingShot(entity.id).catch(console.error)
        }
    }

    protected async supershot(bot: Ranger, priority: (a: Entity, b: Entity) => boolean) {
        if (!bot.canUse("supershot")) return // We can't supershot

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "supershot",
            withinRange: "supershot"
        })
        if (entities.length == 0) return // No targets to attack

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) {
            // If we can kill something guaranteed, break early
            if (bot.canKillInOneShot(entity, "supershot")) {
                this.preventOverkill(bot, entity)
                return bot.superShot(entity.id).catch(console.error)
            }

            targets.add(entity)
        }

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const entity = targets.poll()

            if (!entity.target) {
                // We're going to be tanking this monster, don't attack if it pushes us over our limit
                if (bot.targets >= this.options.maximumTargets) continue // We don't want another target
                switch (entity.damage_type) {
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

            return bot.superShot(entity.id).catch(console.error)
        }
    }

    protected applyHuntersMark(bot: Ranger, entity: Entity) {
        if (!entity) return // No entity
        if (entity.immune && !AL.Game.G.skills.huntersmark.pierces_immunity) return // Can't mark
        if (!bot.canUse("huntersmark")) return
        if (bot.mp < bot.mp_cost + AL.Game.G.skills.huntersmark.mp) return // Not enough MP
        if (bot.canKillInOneShot(entity) || entity.willBurnToDeath() || entity.willDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)) return // Would be a waste to use if we can kill it right away

        bot.huntersMark(entity.id).catch(console.error)
    }
}