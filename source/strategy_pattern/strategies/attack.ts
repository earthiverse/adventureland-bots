import AL, { Character, EntitiesData, Entity, GetEntitiesFilters, ItemName, LocateItemFilters, Mage, PingCompensatedCharacter, SkillName, SlotType, Warrior } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { sleep } from "../../base/general.js"
import { sortPriority } from "../../base/sort.js"
import { Loop, LoopName, Strategist, Strategy } from "../context.js"

export type EnsureEquipped = {
    [T in SlotType]?: {
        name: ItemName
        filters?: LocateItemFilters
    }
}

export type BaseAttackStrategyOptions = GetEntitiesFilters & {
    contexts: Strategist<PingCompensatedCharacter>[]
    disableBasicAttack?: true
    disableCreditCheck?: true
    disableEnergize?: true
    disableScare?: true
    disableZapper?: true
    /** If set, we will aggro as many nearby monsters as we can */
    enableGreedyAggro?: true
    /** If set, we will check if we have the correct items equipped before and after attacking */
    ensureEquipped?: EnsureEquipped
    maximumTargets?: number
}

export class BaseAttackStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected greedyOnEntities: (data: EntitiesData) => Promise<unknown>

    protected options: BaseAttackStrategyOptions
    protected interval: SkillName[] = ["attack"]

    public constructor(options?: BaseAttackStrategyOptions) {
        this.options = options ?? {
            contexts: []
        }
        if (!this.options.disableCreditCheck && this.options.couldGiveCredit === undefined) this.options.couldGiveCredit = true
        if (this.options.willDieToProjectiles === undefined) this.options.willDieToProjectiles = false

        if (!options.disableZapper) this.interval.push("zapperzap")

        this.loops.set("attack", {
            fn: async (bot: Type) => {
                if (this.shouldScare(bot)) await this.scare(bot)
                await this.attack(bot)
            },
            interval: this.interval
        })
    }

    public onApply(bot: Type) {
        if (this.options.enableGreedyAggro) {
            this.greedyOnEntities = async (data: EntitiesData) => {
                if (data.monsters.length == 0) return // No monsters
                if (!this.shouldAttack(bot)) return
                if (!this.options.disableZapper && bot.canUse("zapperzap")) {
                    for (const monster of data.monsters) {
                        if (monster.target) continue // Already has a target
                        if (this.options.type && monster.type !== this.options.type) continue
                        if (this.options.typeList && !this.options.typeList.includes(monster.type)) continue
                        if (AL.Tools.distance(bot, monster) > AL.Game.G.skills.zapperzap.range) continue
                        bot.nextSkill.set("zapperzap", new Date(Date.now() + (bot.ping * 2)))
                        return bot.zapperZap(monster.id).catch(console.error)
                    }
                }
                // TODO: Refactor so this can be put in attack_warrior
                if (bot.ctype == "warrior" && bot.canUse("taunt")) {
                    for (const monster of data.monsters) {
                        if (monster.target) continue // Already has a target
                        if (this.options.type && monster.type !== this.options.type) continue
                        if (this.options.typeList && !this.options.typeList.includes(monster.type)) continue
                        if (AL.Tools.distance(bot, monster) > AL.Game.G.skills.taunt.range) continue
                        bot.nextSkill.set("taunt", new Date(Date.now() + (bot.ping * 2)))
                        return (bot as unknown as Warrior).taunt(monster.id).catch(console.error)
                    }
                }
                // TODO: Refactor so this can be put in attack_mage
                if (bot.ctype == "mage" && bot.canUse("cburst")) {
                    const cbursts: [string, number][] = []
                    for (const monster of data.monsters) {
                        if (monster.target) continue // Already has a target
                        if (this.options.type && monster.type !== this.options.type) continue
                        if (this.options.typeList && !this.options.typeList.includes(monster.type)) continue
                        if (AL.Tools.distance(bot, monster) > AL.Game.G.skills.taunt.range) continue
                        cbursts.push([monster.id, 1])
                    }
                    for (const monster of bot.getEntities({
                        hasTarget: false,
                        type: this.options.type,
                        typeList: this.options.typeList,
                        withinRange: "cburst"
                    })) {
                        if (cbursts.some((cburst) => cburst[0] == monster.id)) continue // Already in our list to cburst
                        cbursts.push([monster.id, 1])
                    }
                    if (cbursts.length) {
                        bot.nextSkill.set("cburst", new Date(Date.now() + (bot.ping * 2)))
                        return (bot as unknown as Mage).cburst(cbursts).catch(console.error)
                    }
                }
                if (bot.canUse("attack")) {
                    for (const monster of data.monsters) {
                        if (monster.target) continue // Already has a target
                        if (this.options.type && monster.type !== this.options.type) continue
                        if (this.options.typeList && !this.options.typeList.includes(monster.type)) continue
                        if (AL.Tools.distance(bot, monster) > bot.range) continue
                        bot.nextSkill.set("attack", new Date(Date.now() + (bot.ping * 2)))
                        return bot.basicAttack(monster.id).catch(console.error)
                    }
                }
            }
            bot.socket.on("entities", this.greedyOnEntities)
        }
    }

    public async onRemove(bot: Type) {
        if (this.greedyOnEntities) bot.socket.removeListener("entities", this.greedyOnEntities)
    }

    protected async attack(bot: Type) {
        const priority = sortPriority(bot, this.options.typeList)

        if (!this.shouldAttack(bot)) return

        await this.ensureEquipped(bot)

        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority)

        await this.ensureEquipped(bot)
    }

    protected async basicAttack(bot: Type, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("attack")) return // We can't attack

        if (this.options.enableGreedyAggro) {
            // Attack an entity that doesn't have a target if we can
            const entities = bot.getEntities({
                canDamage: "attack",
                hasTarget: false,
                type: this.options.type,
                typeList: this.options.typeList,
                withinRange: "attack"
            })
            if (
                entities.length
                && !(this.options.maximumTargets && bot.targets >= this.options.maximumTargets)) {
                // Prioritize the entities
                const targets = new FastPriorityQueue<Entity>(priority)
                for (const entity of entities) targets.add(entity)

                return bot.basicAttack(targets.peek().id).catch(console.error)
            }
        }

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "attack",
            withinRange: "attack"
        })
        if (entities.length == 0) return // No targets to attack

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't attack if it pushes us over our limit
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

            const canKill = bot.canKillInOneShot(target)
            if (canKill) this.preventOverkill(bot, target)
            if (!canKill || targets.size > 0) this.getEnergizeFromOther(bot)
            return bot.basicAttack(target.id).catch(console.error)
        }
    }

    protected async ensureEquipped(bot: Type) {
        if (!this.options.ensureEquipped) return
        for (const sT in this.options.ensureEquipped) {
            const slotType = sT as SlotType
            const ensure = this.options.ensureEquipped[slotType]
            if (
                !bot.slots[slotType]
                || bot.slots[slotType].name !== ensure.name
                || (ensure.filters.returnHighestLevel && bot.hasItem(ensure.name, bot.items, { ...ensure.filters, levelGreaterThan: bot.slots[slotType].level })) // We have a higher level one to equip
                || (ensure.filters.returnLowestLevel && bot.hasItem(ensure.name, bot.items, { ...ensure.filters, levelLessThan: bot.slots[slotType].level })) // We have a lower level one to equip
            ) {
                const toEquip = bot.locateItem(ensure.name, bot.items, ensure.filters)
                if (toEquip == undefined) throw new Error(`Couldn't find ${ensure.name} to equip in ${sT}.`)

                // Doublehand logic
                if (slotType == "mainhand") {
                    const weaponType = AL.Game.G.items[ensure.name].wtype
                    const doubleHandTypes = AL.Game.G.classes[bot.ctype].doublehand
                    if (weaponType && doubleHandTypes && doubleHandTypes[weaponType]) {
                        if (this.options.ensureEquipped.offhand) throw new Error(`'${ensure.name}' is a doublehand for ${bot.ctype}. We can't equip '${this.options.ensureEquipped.offhand}' in our offhand.`)
                        if (bot.slots.offhand) await bot.unequip("offhand")
                    }
                }

                await bot.equip(toEquip, slotType)
            }
        }
    }

    protected async scare(bot: Type) {
        if (this.options.disableScare) return
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        return bot.scare().catch(console.error)
    }

    protected async zapperAttack(bot: Type, priority: (a: Entity, b: Entity) => boolean) {
        if (this.options.disableZapper) return
        if (!bot.canUse("zapperzap")) return // We can't zap

        if (this.options.enableGreedyAggro) {
            const entities = bot.getEntities({
                canDamage: "zapperzap",
                hasTarget: false,
                type: this.options.type,
                typeList: this.options.typeList,
                withinRange: "zapperzap"
            })
            if (
                entities.length
                && !(this.options.maximumTargets && bot.targets >= this.options.maximumTargets)) {
                // Prioritize the entities
                const targets = new FastPriorityQueue<Entity>(priority)
                for (const entity of entities) targets.add(entity)

                return bot.zapperZap(targets.peek().id).catch(console.error)
            }
        }

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "zapperzap",
            withinRange: "zapperzap"
        })
        if (bot.mp < bot.max_mp - 500) {
            // When we're not near full mp, only zap if we can kill the entity in one shot
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i]
                if (!bot.canKillInOneShot(entity, "zapperzap")) {
                    entities.splice(i, 1)
                    i--
                    continue
                }
            }
        }
        if (entities.length == 0) return // No targets to attack

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) {
            // If we can kill something guaranteed, break early
            if (bot.canKillInOneShot(entity, "zapperzap")) {
                this.preventOverkill(bot, entity)
                return bot.zapperZap(entity.id).catch(console.error)
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

            return bot.zapperZap(entity.id).catch(console.error)
        }
    }

    /**
     * If we have `options.characters` set, we look for a mage that can energize us.
     *
     * @param bot The bot to energize
     */
    protected getEnergizeFromOther(bot: Character) {
        if (this.options.disableEnergize) return
        if (bot.s.energized) return // We're already energized

        for (const context of this.options.contexts) {
            if (!context.isReady()) continue
            const char = context.bot
            if (!char) continue // Friend is missing
            if (char == bot) continue // Can't energize ourselves
            if (AL.Tools.distance(bot, char) > bot.G.skills.energize.range) continue // Too far away
            if (!char.canUse("energize")) continue // Friend can't use energize

            // Energize!
            (char as Mage).energize(bot.id, Math.min(100, Math.max(1, bot.max_mp - bot.mp))).catch(console.error)
            return
        }
    }

    /**
     * Call this function if we are going to kill the target
     *
     * If we have `options.characters` set, calling this will remove the target from the other
     * characters so they won't attack it.
     *
     * @param bot The bot that is performing the attack
     * @param target The target we will kill
     */
    protected preventOverkill(bot: Character, target: Entity) {
        for (const context of this.options.contexts) {
            if (!context.isReady()) continue
            const char = context.bot
            if (char == bot) continue // Don't remove it from ourself
            if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
            char.deleteEntity(target.id)
        }
    }

    /**
     * Check if we should attack with the bot, or if there's a reason we shouldn't.
     *
     * @param bot The bot that is attacking
     */
    protected shouldAttack(bot: Character) {
        if (bot.c.town) return false // Don't attack if teleporting
        if (bot.c.fishing || bot.c.mining) return false // Don't attack if mining or fishing
        if (bot.isOnCooldown("scare")) return false // Don't attack if scare is on cooldown
        return true
    }

    protected shouldScare(bot: Character) {
        if (bot.targets == 0) return false // Nothing is targeting us
        if (this.options.disableScare) return false // We have scare disabled

        if (this.options.type || this.options.typeList) {
            // If something else is targeting us, scare
            const targetingMe = bot.getEntities({ notType: this.options.type, notTypeList: this.options.typeList, targetingMe: true })
            if (targetingMe.length) {
                console.debug(bot.id, "wants to scare because something random is targeting us:", targetingMe[0].type)
                return true
            }
        }

        // If we have more targets than what our maximum is set to, we probably want to scare
        if (this.options.maximumTargets !== undefined && bot.targets > this.options.maximumTargets) {
            console.debug(bot.id, "wants to scare because they are over the maximumTargets set:", bot.targets, "/", this.options.maximumTargets)
            return true
        }

        // If we could die due to attacks from incoming monsters
        let potentialIncomingDamage = 0
        for (const entity of bot.getEntities({ targetingMe: true })) {
            if (AL.Tools.distance(bot, entity) > entity.range + entity.speed) continue // Too far away to attack us
            potentialIncomingDamage += entity.calculateDamageRange(bot)[1]
        }
        if (potentialIncomingDamage >= bot.hp) {
            console.debug(bot.id, "wants to scare because we're about to take a lot of damage:", potentialIncomingDamage)
            return true
        }

        // If we have enableGreedyAggro on, we are probably okay with a lot of targets
        if (this.options.enableGreedyAggro) return false

        return bot.isScared()
    }
}