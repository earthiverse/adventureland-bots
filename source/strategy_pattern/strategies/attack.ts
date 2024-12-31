import AL, {
    ActionData,
    Character,
    EntitiesData,
    Entity,
    GetEntitiesFilters,
    ItemName,
    LocateItemFilters,
    Mage,
    MonsterName,
    PingCompensatedCharacter,
    SkillName,
    SlotType,
    Warrior,
} from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { sleep } from "../../base/general.js"
import { sortPriority } from "../../base/sort.js"
import { Loop, LoopName, Strategist, Strategy, filterContexts } from "../context.js"
import { suppress_errors } from "../logging.js"
import { GenerateEnsureEquipped, generateEnsureEquipped } from "../setups/equipment.js"

export type EnsureEquippedSlot = {
    name: ItemName
    filters?: LocateItemFilters
    unequip?: true
}
export type EnsureEquipped = {
    [T in SlotType]?: EnsureEquippedSlot
}

export type BaseAttackStrategyOptions = GetEntitiesFilters & {
    contexts: Strategist<PingCompensatedCharacter>[]
    disableBasicAttack?: true
    disableCreditCheck?: true
    disableEnergize?: true
    disableIdleAttack?: true
    disableKillSteal?: true
    disableScare?: true
    disableZapper?: true
    /** Disables using zapper to aggro the monster */
    disableZapperGreedyAggro?: true
    /** If set, we will aggro as many nearby monsters as we can */
    enableGreedyAggro?: true | MonsterName[]
    /** If set, we will check if we have the correct items equipped before and after attacking */
    ensureEquipped?: EnsureEquipped
    /** If set, we will generate a loadout */
    generateEnsureEquipped?: GenerateEnsureEquipped
    maximumTargets?: number
}

export const KILL_STEAL_AVOID_MONSTERS: MonsterName[] = [
    "kitty1",
    "kitty2",
    "kitty3",
    "kitty4",
    "puppy1",
    "puppy2",
    "puppy3",
    "puppy4",
]
export const IDLE_ATTACK_MONSTERS: MonsterName[] = [
    "arcticbee",
    "armadillo",
    "bat",
    "bee",
    "boar",
    "crab",
    "crabx",
    "croc",
    "cutebee",
    "frog",
    "goo",
    "hen",
    "iceroamer",
    "minimush",
    "nerfedbat",
    "osnake",
    "phoenix",
    "poisio",
    "rat",
    "rooster",
    "scorpion",
    "slenderman",
    "snake",
    "snowman",
    "spider",
    "squig",
    "squigtoad",
    "tortoise",
    "wabbit",
]

export class BaseAttackStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected greedyOnEntities: (data: EntitiesData) => unknown
    protected stealOnAction: (data: ActionData) => unknown

    protected botSort = new Map<string, (a: Entity, b: Entity) => boolean>()
    protected botEnsureEquipped = new Map<string, EnsureEquipped>()

    protected options: BaseAttackStrategyOptions

    protected interval: SkillName[] = ["attack"]

    public constructor(options?: BaseAttackStrategyOptions) {
        this.options = options ?? {
            contexts: [],
        }
        if (!this.options.disableCreditCheck && this.options.couldGiveCredit === undefined)
            this.options.couldGiveCredit = true
        if (this.options.willDieToProjectiles === undefined) this.options.willDieToProjectiles = false

        if (!options.disableZapper) this.interval.push("zapperzap")

        if (this.options.type) {
            this.options.typeList = [this.options.type]
            delete this.options.type
        }

        this.loops.set("attack", {
            fn: async (bot: Type) => {
                if (this.shouldScare(bot)) await this.scare(bot)
                await this.attack(bot).catch(suppress_errors)
            },
            interval: this.interval,
        })
    }

    public onApply(bot: Type) {
        if (this.options.generateEnsureEquipped)
            this.options.ensureEquipped = generateEnsureEquipped(bot, this.options.generateEnsureEquipped)
        this.botEnsureEquipped.set(bot.id, this.options.ensureEquipped)

        this.botSort.set(bot.id, sortPriority(bot, this.options.typeList))

        if (!this.options.disableKillSteal && !this.options.disableZapper) {
            this.stealOnAction = (data: ActionData) => {
                if (!bot.canUse("zapperzap")) return
                if (bot.c.town) return // Currently warping to town

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
                return bot.zapperZap(data.target).catch()
            }
            bot.socket.on("action", this.stealOnAction)
        }
        if (this.options.enableGreedyAggro) {
            this.greedyOnEntities = (data: EntitiesData) => {
                if (data.monsters.length == 0) return // No monsters
                if (this.options.maximumTargets !== undefined && bot.targets >= this.options.maximumTargets) return // Don't want any more targets

                if (!this.shouldAttack(bot)) return
                if (!this.options.disableZapper && !this.options.disableZapperGreedyAggro && bot.canUse("zapperzap")) {
                    for (const monster of data.monsters) {
                        if (monster.target) continue // Already has a target
                        if (
                            Array.isArray(this.options.enableGreedyAggro) &&
                            !this.options.enableGreedyAggro.includes(monster.type)
                        )
                            continue
                        if (this.options.typeList && !this.options.typeList.includes(monster.type)) continue
                        if (AL.Tools.distance(bot, monster) > AL.Game.G.skills.zapperzap.range) continue
                        if (AL.Game.G.monsters[monster.type].immune) continue // Can't damage immune monsters with zapperzap
                        bot.nextSkill.set("zapperzap", new Date(Date.now() + bot.ping * 2))
                        return bot.zapperZap(monster.id).catch()
                    }
                }
                // TODO: Refactor so this can be put in attack_warrior
                if (bot.ctype == "warrior" && bot.canUse("taunt")) {
                    for (const monster of data.monsters) {
                        if (monster.target) continue // Already has a target
                        if (
                            Array.isArray(this.options.enableGreedyAggro) &&
                            !this.options.enableGreedyAggro.includes(monster.type)
                        )
                            continue
                        if (this.options.typeList && !this.options.typeList.includes(monster.type)) continue
                        if (AL.Tools.distance(bot, monster) > AL.Game.G.skills.taunt.range) continue
                        bot.nextSkill.set("taunt", new Date(Date.now() + bot.ping * 2))
                        return (bot as unknown as Warrior).taunt(monster.id).catch(suppress_errors)
                    }
                }
                // TODO: Refactor so this can be put in attack_mage
                if (bot.ctype == "mage" && bot.canUse("cburst")) {
                    const cbursts: [string, number][] = []
                    for (const monster of data.monsters) {
                        if (monster.target) continue // Already has a target
                        if (
                            Array.isArray(this.options.enableGreedyAggro) &&
                            !this.options.enableGreedyAggro.includes(monster.type)
                        )
                            continue
                        if (this.options.typeList && !this.options.typeList.includes(monster.type)) continue
                        if (AL.Tools.distance(bot, monster) > AL.Game.G.skills.cburst.range) continue
                        cbursts.push([monster.id, 1])
                    }
                    for (const monster of bot.getEntities({
                        hasTarget: false,
                        typeList: this.options.typeList,
                        withinRange: "cburst",
                    })) {
                        if (cbursts.some((cburst) => cburst[0] == monster.id)) continue // Already in our list to cburst
                        cbursts.push([monster.id, 1])
                    }
                    if (cbursts.length) {
                        bot.nextSkill.set("cburst", new Date(Date.now() + bot.ping * 2))
                        return (bot as unknown as Mage).cburst(cbursts).catch()
                    }
                }
                if (bot.canUse("attack")) {
                    for (const monster of data.monsters) {
                        if (monster.target) continue // Already has a target
                        if (
                            Array.isArray(this.options.enableGreedyAggro) &&
                            !this.options.enableGreedyAggro.includes(monster.type)
                        )
                            continue
                        if (this.options.typeList && !this.options.typeList.includes(monster.type)) continue
                        if (AL.Tools.distance(bot, monster) > bot.range) continue
                        bot.nextSkill.set("attack", new Date(Date.now() + bot.ping * 2))
                        return bot.basicAttack(monster.id).catch()
                    }
                }
            }
            bot.socket.on("entities", this.greedyOnEntities)
        }
    }

    public onRemove(bot: Type) {
        if (this.greedyOnEntities) bot.socket.removeListener("entities", this.greedyOnEntities)
        if (this.stealOnAction) bot.socket.removeListener("action", this.stealOnAction)
    }

    protected async attack(bot: Type) {
        const priority = this.botSort.get(bot.id)

        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot).catch(suppress_errors)
            return
        }

        await this.ensureEquipped(bot)

        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority).catch(suppress_errors)

        await this.ensureEquipped(bot)
    }

    protected async basicAttack(bot: Type, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("attack")) return // We can't attack

        if (this.options.enableGreedyAggro) {
            // Attack an entity that doesn't have a target if we can
            const entities = bot.getEntities({
                canDamage: "attack",
                hasTarget: false,
                typeList: Array.isArray(this.options.enableGreedyAggro)
                    ? this.options.enableGreedyAggro
                    : this.options.typeList,
                withinRange: "attack",
            })
            if (
                entities.length &&
                !(this.options.maximumTargets !== undefined && bot.targets >= this.options.maximumTargets)
            ) {
                // Prioritize the entities
                const targets = new FastPriorityQueue<Entity>(priority)
                for (const entity of entities) targets.add(entity)
                const target = targets.peek()

                const canKill = bot.canKillInOneShot(target)
                if (canKill) this.preventOverkill(bot, target)
                if (
                    !canKill ||
                    targets.size > 0 ||
                    bot.mp < bot.max_mp * 0.25 // Energize if we are low on MP
                )
                    this.getEnergizeFromOther(bot).catch(suppress_errors)

                return bot.basicAttack(target.id)
            }
        }

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "attack",
            withinRange: "attack",
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
                if (this.options.maximumTargets !== undefined && bot.targets >= this.options.maximumTargets) continue // We don't want another target
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
            if (!canKill || targets.size > 0) this.getEnergizeFromOther(bot).catch(suppress_errors)

            return bot.basicAttack(target.id)
        }
    }

    protected async idleAttack(bot: Type, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
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

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't attack if it pushes us over our limit
                if (this.options.maximumTargets !== undefined && bot.targets >= this.options.maximumTargets) continue // We don't want another target
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
            if (!canKill || targets.size > 0) this.getEnergizeFromOther(bot).catch(suppress_errors)

            return bot.basicAttack(target.id)
        }
    }

    protected async ensureEquipped(bot: Type) {
        const ensureEquipped = this.botEnsureEquipped.get(bot.id)
        if (!ensureEquipped) return

        const equipBatch: { num: number; slot: SlotType }[] = []

        for (const sT in ensureEquipped) {
            const slotType = sT as SlotType
            const ensure = ensureEquipped[slotType]

            if (ensure.unequip) {
                // We want no item in this slot
                if (bot.slots[slotType]) await bot.unequip(slotType)
                continue
            }

            if (
                // We don't have anything equipped
                !bot.slots[slotType] ||
                // We don't have the same name equipped
                bot.slots[slotType].name !== ensure.name ||
                // We want the highest level, and we have a higher level item in our inventory
                (ensure.filters?.returnHighestLevel &&
                    bot.hasItem(ensure.name, bot.items, {
                        ...ensure.filters,
                        levelGreaterThan: bot.slots[slotType].level,
                    })) || // We have a higher level one to equip
                // We want the lowest level, and d we have a lower level item in our inventory
                (ensure.filters?.returnLowestLevel &&
                    bot.hasItem(ensure.name, bot.items, {
                        ...ensure.filters,
                        levelLessThan: bot.slots[slotType].level,
                    })) // We have a lower level one to equip
            ) {
                let toEquip = bot.locateItem(ensure.name, bot.items, ensure.filters)
                if (toEquip === undefined) {
                    if (
                        slotType === "mainhand" &&
                        // We have it equipped in our offhand
                        bot.slots["offhand"]?.name === ensure.name &&
                        // We don't want it equipped in our offhand
                        (!ensureEquipped["offhand"] || ensureEquipped["offhand"].name !== ensure.name) &&
                        // We have enough space to unequip something
                        bot.esize > 0
                    ) {
                        toEquip = await bot.unequip("offhand")
                    } else if (
                        slotType === "offhand" &&
                        // We have it equipped in our mainhand
                        bot.slots["mainhand"]?.name === ensure.name &&
                        // We don't want it equipped in our mainhand
                        (!ensureEquipped["mainhand"] || ensureEquipped["mainhand"].name !== ensure.name) &&
                        // We have enough space to unequip something
                        bot.esize > 0
                    ) {
                        toEquip = await bot.unequip("mainhand")
                    } else if (
                        slotType === "ring1" &&
                        // We have it equipped in the other slot
                        bot.slots["ring2"]?.name === ensure.name &&
                        // We have enough space to unequip something
                        bot.esize > 0
                    ) {
                        toEquip = await bot.unequip("ring2")
                    } else if (
                        slotType === "ring2" &&
                        // We have it equipped in the other slot
                        bot.slots["ring1"]?.name === ensure.name &&
                        // We have enough space to unequip something
                        bot.esize > 0
                    ) {
                        toEquip = await bot.unequip("earring1")
                    } else if (
                        slotType === "earring1" &&
                        // We have it equipped in the other slot
                        bot.slots["earring2"]?.name === ensure.name &&
                        // We have enough space to unequip something
                        bot.esize > 0
                    ) {
                        toEquip = await bot.unequip("earring2")
                    } else if (
                        slotType === "earring2" &&
                        // We have it equipped in the other slot
                        bot.slots["earring1"]?.name === ensure.name &&
                        // We have enough space to unequip something
                        bot.esize > 0
                    ) {
                        toEquip = await bot.unequip("earring1")
                    }
                    // TODO: Add cases for earrings and rings
                    else {
                        throw new Error(`${bot.name} couldn't find ${ensure.name} to equip in ${sT}.`)
                    }
                }

                // Doublehand logic
                if (slotType == "mainhand") {
                    // Check if we have to unequip offhand
                    const weaponType = AL.Game.G.items[ensure.name].wtype
                    const doubleHandTypes = AL.Game.G.classes[bot.ctype].doublehand
                    if (weaponType && doubleHandTypes && doubleHandTypes[weaponType]) {
                        if (ensureEquipped.offhand && !ensureEquipped.offhand.unequip)
                            throw new Error(
                                `'${ensure.name}' is a doublehand for ${bot.ctype}. We can't equip ${ensureEquipped.offhand.name} in our offhand.`,
                            )
                        if (bot.slots.offhand) {
                            if (bot.esize <= 0) continue // We don't have enough space to unequip our offhand
                            await bot.unequip("offhand")
                        }
                    }
                } else if (slotType == "offhand" && bot.slots["mainhand"]) {
                    // Check if we have to unequip mainhand
                    const equippedName = bot.slots["mainhand"].name
                    const weaponType = AL.Game.G.items[equippedName].wtype
                    const doubleHandTypes = AL.Game.G.classes[bot.ctype].doublehand
                    if (weaponType && doubleHandTypes && doubleHandTypes[weaponType]) {
                        if (bot.esize <= 0) continue // We don't have enough space to unequip our offhand
                        await bot.unequip("mainhand")
                    }
                }

                equipBatch.push({ num: toEquip, slot: slotType })
            }
        }

        if (equipBatch.length) await bot.equipBatch(equipBatch).catch(console.error)
    }

    protected async scare(bot: Type) {
        if (this.options.disableScare) return
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko") && bot.canUse("scare", { ignoreEquipped: true })) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        return bot.scare()
    }

    /**
     * Extra attack logic if we "shouldn't attack", but we still have a target
     */
    protected async defensiveAttack(bot: Type) {
        if (!bot.canUse("attack")) return // We can't attack

        const entity = bot.getEntity({
            ...this.options,
            canDamage: "attack",
            targetingMe: true,
            withinRange: "attack",
            returnLowestHP: true,
        })
        if (!entity) return // No entity

        return bot.basicAttack(entity.id)
    }

    protected async zapperAttack(bot: Type, priority: (a: Entity, b: Entity) => boolean) {
        if (this.options.disableZapper) return
        if (!bot.canUse("zapperzap")) return // We can't zap

        if (this.options.enableGreedyAggro && !this.options.disableZapperGreedyAggro) {
            const entities = bot.getEntities({
                canDamage: "zapperzap",
                hasTarget: false,
                typeList: Array.isArray(this.options.enableGreedyAggro)
                    ? this.options.enableGreedyAggro
                    : this.options.typeList,
                withinRange: "zapperzap",
            })
            if (
                entities.length &&
                !(this.options.maximumTargets !== undefined && bot.targets >= this.options.maximumTargets)
            ) {
                // Prioritize the entities
                const targets = new FastPriorityQueue<Entity>(priority)
                for (const entity of entities) targets.add(entity)

                return bot.zapperZap(targets.peek().id)
            }
        }

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "zapperzap",
            withinRange: "zapperzap",
        })
        if (entities.length == 0) return // No targets to attack

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
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't attack if it pushes us over our limit
                if (this.options.maximumTargets !== undefined && bot.targets >= this.options.maximumTargets) continue // We don't want another target
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

            return bot.zapperZap(target.id)
        }
    }

    /**
     * If we have `options.characters` set, we look for a mage that can energize us.
     *
     * @param bot The bot to energize
     */
    protected async getEnergizeFromOther(bot: Character) {
        if (this.options.disableEnergize) return
        if (bot.s.energized) return // We're already energized

        for (const context of filterContexts(this.options.contexts, { serverData: bot.serverData })) {
            const char = context.bot
            if (char == bot) continue // Can't energize ourselves
            if (AL.Tools.distance(bot, char) > bot.G.skills.energize.range) continue // Too far away
            if (!char.canUse("energize")) continue // Friend can't use energize
            if (char.mp < char.max_mp * 0.25) continue // Don't use energize if mage is low on MP

            // Energize!
            return (char as Mage).energize(bot.id, Math.min(char.mp * 0.25, Math.max(1, bot.max_mp - bot.mp)))
        }
    }

    /**
     * Call this function if we are going to kill the target
     *
     * If we have `options.contexts` set, calling this will remove the target from the other
     * contexts so they won't attack it.
     *
     * @param bot The bot that is performing the attack
     * @param target The target we will kill
     */
    protected preventOverkill(bot: Character, target: Entity) {
        for (const context of filterContexts(this.options.contexts, { serverData: bot.serverData })) {
            const friend = context.bot
            if (friend == bot) continue // Don't remove it from ourself
            if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
            friend.deleteEntity(target.id)
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
        if (!this.options.disableScare && bot.isOnCooldown("scare")) return false // Don't attack if scare is on cooldown
        return true
    }

    protected shouldScare(bot: Character) {
        if (bot.targets == 0) return false // Nothing is targeting us
        if (this.options.disableScare) return false // We have scare disabled

        if (this.options.typeList) {
            // If something else is targeting us, scare
            const targetingMe = bot.getEntities({
                notTypeList: [
                    ...this.options.typeList,
                    ...(this.options.disableIdleAttack ? [] : IDLE_ATTACK_MONSTERS),
                ],
                targetingMe: true,
                willDieToProjectiles: false,
            })
            if (targetingMe.length) {
                return true
            }
        }

        if (this.options.type) {
            // If something else is targeting us, scare
            const targetingMe = bot.getEntities({
                notTypeList: [this.options.type, ...(this.options.disableIdleAttack ? [] : IDLE_ATTACK_MONSTERS)],
                targetingMe: true,
                willDieToProjectiles: false,
            })
            if (targetingMe.length) {
                return true
            }
        }

        // If we have more targets than what our maximum is set to, we probably want to scare
        if (this.options.maximumTargets !== undefined && bot.targets > this.options.maximumTargets) {
            return true
        }

        // If we could die due to attacks from incoming monsters
        let potentialIncomingDamage = 0
        const multiplier = bot.calculateTargets()
        multiplier["magical"] -= bot.mcourage
        multiplier["physical"] -= bot.courage
        multiplier["pure"] -= bot.pcourage
        for (const entity of bot.getEntities({ targetingMe: true })) {
            if (AL.Tools.distance(bot, entity) > entity.range + entity.speed) continue // Too far away to attack us
            let entityDamage = entity.calculateDamageRange(bot)[1]

            // Calculate additional mobbing damage
            if (multiplier[entity.damage_type] > 0) entityDamage *= 1 + 0.2 * multiplier[entity.damage_type]

            potentialIncomingDamage += entityDamage
        }
        if (potentialIncomingDamage >= bot.hp) return true

        // If we have enableGreedyAggro on, we are probably okay with a lot of targets
        if (this.options.enableGreedyAggro) return false

        return bot.isScared()
    }
}
