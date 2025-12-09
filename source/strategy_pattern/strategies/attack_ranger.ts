import AL, { Entity, Ranger } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { BaseAttackStrategy, BaseAttackStrategyOptions, IDLE_ATTACK_MONSTERS } from "./attack.js"
import { suppress_errors } from "../logging.js"

export type RangerAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableHuntersMark?: boolean
    disableMultiShot?: boolean
    disableSuperShot?: boolean
}

export class RangerAttackStrategy extends BaseAttackStrategy<Ranger> {
    public declare options: RangerAttackStrategyOptions

    public constructor(options?: RangerAttackStrategyOptions) {
        super(options)

        if (!this.options.disableHuntersMark) this.interval.push("huntersmark")
        if (!this.options.disableSuperShot) this.interval.push("supershot")
    }

    protected async attack(bot: Ranger) {
        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot).catch(suppress_errors)
            return
        }

        const priority = this.botSort.get(bot.id)

        await this.ensureEquipped(bot).catch(console.error)

        await this.multiAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableSuperShot) await this.supershot(bot, priority).catch(suppress_errors)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority).catch(suppress_errors)

        await this.ensureEquipped(bot).catch(console.error)
    }

    protected async multiAttack(bot: Ranger, priority: (a: Entity, b: Entity) => boolean) {
        if (!bot.canUse("attack")) return

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "attack",
            withinRange: "attack",
        })
        if (entities.length == 0) return // No targets to attack

        let targetingMe = bot.calculateTargets()
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
                        if (!addedToThreeShotTargets) threeShotTargets.add(entity)
                        fiveShotTargets.add(entity)
                        targetingMe.physical += 1
                        continue
                    }
                    break
                case "pure":
                    if (bot.pcourage > targetingMe.pure) {
                        // We can tank one more pure monster
                        if (!addedToThreeShotTargets) threeShotTargets.add(entity)
                        fiveShotTargets.add(entity)
                        targetingMe.pure += 1
                        continue
                    }
                    break
            }
        }

        if (!this.options.disableHuntersMark) this.applyHuntersMark(bot, targets.peek()).catch(suppress_errors)

        if (!this.options.disableMultiShot && fiveShotTargets.size >= 5 && bot.canUse("5shot")) {
            const entities: Entity[] = []
            while (entities.length < 5) {
                const entity = fiveShotTargets.poll()
                entities.push(entity)
                if (bot.canKillInOneShot(entity, "5shot")) this.preventOverkill(bot, entity)
            }

            this.getEnergizeFromOther(bot).catch(suppress_errors)
            return bot.fiveShot(entities[0].id, entities[1].id, entities[2].id, entities[3].id, entities[4].id)
        } else if (!this.options.disableMultiShot && threeShotTargets.size >= 3 && bot.canUse("3shot")) {
            const entities: Entity[] = []
            while (entities.length < 3) {
                const entity = threeShotTargets.poll()
                entities.push(entity)
                if (bot.canKillInOneShot(entity, "3shot")) this.preventOverkill(bot, entity)
            }

            this.getEnergizeFromOther(bot).catch(suppress_errors)
            return bot.threeShot(entities[0].id, entities[1].id, entities[2].id)
        }

        // Recalculate our targets, because we changed this for multi-shot, but didn't use multi-shot.
        targetingMe = bot.calculateTargets()

        const canUsePiercingShot = bot.canUse("piercingshot")
        while (targets.size) {
            const entity = targets.poll()

            if (bot.canKillInOneShot(entity)) {
                this.preventOverkill(bot, entity)
                this.getEnergizeFromOther(bot).catch(suppress_errors)
                return bot.basicAttack(entity.id)
            }

            if (canUsePiercingShot && bot.canKillInOneShot(entity, "piercingshot")) {
                this.preventOverkill(bot, entity)
                this.getEnergizeFromOther(bot).catch(suppress_errors)
                return bot.piercingShot(entity.id)
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
                this.getEnergizeFromOther(bot).catch(suppress_errors)
                return bot.basicAttack(entity.id)
            }

            // Use the attack that will do more damage
            const damage = bot.calculateDamageRange(entity)
            const piercingDamage = bot.canUse("piercingshot")
                ? bot.calculateDamageRange(entity, "piercingshot")
                : [0, 0]
            this.getEnergizeFromOther(bot).catch(suppress_errors)
            if (damage[0] >= piercingDamage[0]) return bot.basicAttack(entity.id)
            else return bot.piercingShot(entity.id)
        }
    }

    protected async supershot(bot: Ranger, priority: (a: Entity, b: Entity) => boolean) {
        if (!bot.canUse("supershot")) return // We can't supershot

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "supershot",
            withinRange: "supershot",
        })
        if (entities.length == 0) return // No targets to attack

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) {
            // If we can kill something guaranteed, break early
            if (bot.canKillInOneShot(entity, "supershot")) {
                this.preventOverkill(bot, entity)
                return bot.superShot(entity.id)
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

            return bot.superShot(entity.id)
        }
    }

    protected async idleAttack(bot: Ranger, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("attack")) return // We can't attack
        if (bot.s.town) return // We're warping to town

        const entities = bot.getEntities({
            canDamage: "attack",
            couldGiveCredit: true,
            typeList: IDLE_ATTACK_MONSTERS,
            willBurnToDeath: false,
            willDieToProjectiles: false,
            withinRange: "attack",
        })
        if (entities.length == 0) return // No targets to attack

        let targetingMe = bot.calculateTargets()
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
                        if (!addedToThreeShotTargets) threeShotTargets.add(entity)
                        fiveShotTargets.add(entity)
                        targetingMe.physical += 1
                        continue
                    }
                    break
                case "pure":
                    if (bot.pcourage > targetingMe.pure) {
                        // We can tank one more pure monster
                        if (!addedToThreeShotTargets) threeShotTargets.add(entity)
                        fiveShotTargets.add(entity)
                        targetingMe.pure += 1
                        continue
                    }
                    break
            }
        }
        if (!this.options.disableMultiShot && fiveShotTargets.size >= 5 && bot.canUse("5shot")) {
            const entities: Entity[] = []
            while (entities.length < 5) {
                const entity = fiveShotTargets.poll()
                entities.push(entity)
                if (bot.canKillInOneShot(entity, "5shot")) this.preventOverkill(bot, entity)
            }

            this.getEnergizeFromOther(bot).catch(suppress_errors)
            return bot.fiveShot(entities[0].id, entities[1].id, entities[2].id, entities[3].id, entities[4].id)
        } else if (!this.options.disableMultiShot && threeShotTargets.size >= 3 && bot.canUse("3shot")) {
            const entities: Entity[] = []
            while (entities.length < 3) {
                const entity = threeShotTargets.poll()
                entities.push(entity)
                if (bot.canKillInOneShot(entity, "3shot")) this.preventOverkill(bot, entity)
            }

            this.getEnergizeFromOther(bot).catch(suppress_errors)
            return bot.threeShot(entities[0].id, entities[1].id, entities[2].id)
        }

        // Recalculate our targets, because we changed this for multi-shot, but didn't use multi-shot.
        targetingMe = bot.calculateTargets()

        const canUsePiercingShot = bot.canUse("piercingshot")
        while (targets.size) {
            const entity = targets.poll()

            if (bot.canKillInOneShot(entity)) {
                this.preventOverkill(bot, entity)
                this.getEnergizeFromOther(bot).catch(suppress_errors)
                return bot.basicAttack(entity.id)
            }

            if (canUsePiercingShot && bot.canKillInOneShot(entity, "piercingshot")) {
                this.preventOverkill(bot, entity)
                this.getEnergizeFromOther(bot).catch(suppress_errors)
                return bot.piercingShot(entity.id)
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
                this.getEnergizeFromOther(bot).catch(suppress_errors)
                return bot.basicAttack(entity.id)
            }

            // Use the attack that will do more damage
            const damage = bot.calculateDamageRange(entity)
            const piercingDamage = bot.canUse("piercingshot")
                ? bot.calculateDamageRange(entity, "piercingshot")
                : [0, 0]
            this.getEnergizeFromOther(bot).catch(suppress_errors)
            if (damage[0] >= piercingDamage[0]) return bot.basicAttack(entity.id)
            else return bot.piercingShot(entity.id)
        }
    }

    protected async applyHuntersMark(bot: Ranger, entity: Entity) {
        if (!entity) return // No entity
        if (entity.immune && !AL.Game.G.skills.huntersmark.pierces_immunity) return // Can't mark
        if (!bot.canUse("huntersmark")) return
        if (bot.mp < bot.mp_cost + AL.Game.G.skills.huntersmark.mp) return // Not enough MP
        if (
            bot.canKillInOneShot(entity) ||
            entity.willBurnToDeath() ||
            entity.willDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        )
            return // Would be a waste to use if we can kill it right away

        return bot.huntersMark(entity.id)
    }
}
