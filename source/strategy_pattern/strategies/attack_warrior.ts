import AL, { Attribute, ItemData, MonsterName, SlotType, Tools, Warrior } from "alclient"
import { checkOnlyEveryMS, sleep } from "../../base/general.js"
import { suppress_errors } from "../logging.js"
import { generateEnsureEquipped, RETURN_HIGHEST } from "../setups/equipment.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions, EnsureEquipped, IDLE_ATTACK_MONSTERS } from "./attack.js"

export type WarriorAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableAgitate?: true
    disableCleave?: true
    disableHardshell?: true
    disableStomp?: true
    disableWarCry?: true
    /**
     * If true, we will swap weapons to one that can cleave, cleave, and then swap back.
     *
     * NOTE: It's possible that things can fail, and you will be left holding the item that can cleave.
     *       Use `ensureEquipped` to help alleviate this problem.
     */
    enableEquipForCleave?: true
    /**
     * If true, we will swap weapons to one that can stomp, stomp, and then swap back.
     *
     * NOTE: It's possible that things can fail, and you will be left holding the item that can stomp.
     *       Use `ensureEquipped` to help alleviate this problem.
     */
    enableEquipForStomp?: true
}

export class WarriorAttackStrategy extends BaseAttackStrategy<Warrior> {
    declare public options: WarriorAttackStrategyOptions

    public constructor(options?: WarriorAttackStrategyOptions) {
        super(options)

        this.loops.set("attack", {
            fn: async (bot: Warrior) => {
                if (this.shouldHardshell(bot)) await bot.hardshell().catch(suppress_errors)
                if (this.shouldScare(bot)) await this.scare(bot).catch(suppress_errors)
                await this.attack(bot).catch(suppress_errors)
            },
            interval: this.interval,
        })

        if (!options.disableCleave) this.interval.push("cleave")
        if (!options.disableWarCry) this.interval.push("warcry")
    }

    protected async attack(bot: Warrior) {
        if (!this.options.disableWarCry) this.applyWarCry(bot).catch(suppress_errors)

        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot).catch(suppress_errors)
            return
        }

        const priority = this.botSort.get(bot.id)

        await this.ensureEquipped(bot).catch(console.error)

        if (!this.options.disableAgitate) await this.agitateTargets(bot).catch(suppress_errors)
        if (!this.options.disableStomp) await this.stomp(bot).catch(suppress_errors)
        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableCleave) await this.cleave(bot).catch(suppress_errors)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority).catch(suppress_errors)

        await this.ensureEquipped(bot).catch(console.error)
    }

    protected async agitateTargets(bot: Warrior) {
        if (!this.options.enableGreedyAggro) return // Only agitate if we're greedy

        if (bot.canUse("cleave", { ignoreEquipped: this.options.enableEquipForCleave ?? false })) {
            const unwantedEntity = bot.getEntity({
                hasTarget: false,
                notTypeList: this.options.typeList,
                withinRange: "cleave",
            })
            if (unwantedEntity) return // Something we don't want to cleave is nearby

            const numIfAgitate = bot.getEntities({
                hasTarget: false,
                hasIncomingProjectile: false,
                typeList: Array.isArray(this.options.enableGreedyAggro)
                    ? this.options.enableGreedyAggro
                    : this.options.typeList,
                withinRange: "agitate",
            }).length

            const numIfCleave = bot.getEntities({
                hasTarget: false,
                hasIncomingProjectile: false,
                typeList: Array.isArray(this.options.enableGreedyAggro)
                    ? this.options.enableGreedyAggro
                    : this.options.typeList,
                withinRange: "cleave",
            }).length

            // We can reach the same number of targets (or more!?) if we cleave, so cleave instead
            if (numIfAgitate >= numIfCleave) return this.cleave(bot)
        }

        if (!bot.canUse("agitate")) return // Can't agitate
        const unwantedEntity = bot.getEntity({
            hasTarget: false,
            notTypeList: this.options.typeList,
            withinRange: "agitate",
        })
        if (unwantedEntity) return // Something we don't want to agitate is nearby

        // Agitate all nearby enemies if there are no others nearby
        const ifAgitate = bot.getEntities({
            hasTarget: false,
            hasIncomingProjectile: false,
            typeList: Array.isArray(this.options.enableGreedyAggro)
                ? this.options.enableGreedyAggro
                : this.options.typeList,
            withinRange: "agitate",
        })
        if (ifAgitate.length === 0) return // Nothing to agitate
        if (
            ifAgitate.length === 1 &&
            bot.canUse("taunt") &&
            AL.Game.G.skills.taunt.range >= Tools.distance(bot, ifAgitate[0])
        ) {
            // Taunt if there's only one, and we have it within range
            return bot.taunt(ifAgitate[0].id).catch(suppress_errors)
        }
        // Agitate if there's more than one target
        return bot.agitate().catch(suppress_errors)
    }

    protected async cleave(bot: Warrior) {
        if (!bot.canUse("cleave", { ignoreEquipped: this.options.enableEquipForCleave ?? false })) return // We can't cleave
        if (
            this.options.enableEquipForCleave &&
            !(bot.isEquipped("bataxe") || bot.isEquipped("scythe") || bot.hasItem(["bataxe", "scythe"]))
        )
            return // We don't have a cleave item

        if (bot.isPVP()) {
            const nearby = bot.getPlayers({
                // TODO: Confirm that we can't do damage to party members and friends with cleave on PvP
                isFriendly: true,
                isNPC: false,
                withinRange: "cleave",
            })
            if (nearby.length > 0) return
        }

        const unwantedEntity = bot.getEntity({
            hasTarget: false,
            notTypeList: [
                ...(this.options.notTypeList ?? []),
                ...(this.options.disableIdleAttack ? [] : IDLE_ATTACK_MONSTERS),
            ],
            withinRange: "cleave",
        })
        if (unwantedEntity) return // Something we don't want to cleave is nearby

        // Find all targets within range of cleave
        const entities = bot.getEntities({
            withinRange: "cleave",
            canDamage: "cleave",
        })
        if (entities.length == 0) return // No targets to attack

        // If there's only one entity, and we can kill the entity using one normal attack, don't cleave
        if (entities.length == 1 && bot.canKillInOneShot(entities[0])) return

        // Calculate how much courage we have left to spare
        const targetingMe = bot.calculateTargets()

        let newTargets = 0

        for (const entity of entities) {
            if (
                (this.options.targetingPartyMember && !entity.target) ||
                (this.options.targetingPlayer && !entity.target)
            ) {
                // We want to avoid aggro
                return
            }
            if (this.options.typeList && !this.options.typeList.includes(entity.type)) {
                // We don't want to attack something that's within cleave range
                return
            }

            // Calculate the new fear if we cleave
            if (entity.target) continue // It won't change our fear
            if (bot.canKillInOneShot(entity, "cleave")) continue // It won't change our fear
            switch (entity.damage_type) {
                case "magical":
                    if (bot.mcourage > targetingMe.magical)
                        targetingMe.magical += 1 // We can tank one more magical monster
                    else return // We can't tank any more, don't cleave
                    break
                case "physical":
                    if (bot.courage > targetingMe.physical)
                        targetingMe.physical += 1 // We can tank one more physical monster
                    else return // We can't tank any more, don't cleave
                    break
                case "pure":
                    if (bot.pcourage > targetingMe.pure)
                        targetingMe.pure += 1 // We can tank one more pure monster
                    else return // We can't tank any more, don't cleave
                    break
            }
            newTargets += 1

            if (this.options.maximumTargets && newTargets + bot.targets > this.options.maximumTargets) {
                // We'll go over our limit if we cleave
                return
            }
        }

        for (const entity of entities) if (bot.canKillInOneShot(entity, "cleave")) this.preventOverkill(bot, entity)

        let mainhand: ItemData
        let offhand: ItemData
        if (this.options.enableEquipForCleave) {
            if (!bot.isEquipped(["bataxe", "scythe"])) {
                // Unequip offhand if we have it
                if (bot.slots.offhand) {
                    if (bot.esize <= 0) return // We don't have an inventory slot to unequip the offhand
                    offhand = { ...bot.slots.offhand }
                    await bot.unequip("offhand")
                }
                if (bot.slots.mainhand) mainhand = { ...bot.slots.mainhand }
                await bot.equip(bot.locateItem(["bataxe", "scythe"], bot.items, RETURN_HIGHEST))
                if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms) // Await the penalty cooldown so we can cleave right away
            }
        }

        await bot.cleave()

        if (this.options.enableEquipForCleave) {
            // Re-equip items
            const equipBatch: { num: number; slot: SlotType }[] = []

            if (this.options.ensureEquipped.mainhand && !this.options.ensureEquipped.mainhand.unequip) {
                const num = bot.locateItem(
                    this.options.ensureEquipped.mainhand.name,
                    bot.items,
                    this.options.ensureEquipped.mainhand.filters,
                )
                if (num !== undefined) equipBatch.push({ num, slot: "mainhand" })
            } else if (mainhand) {
                const num = bot.locateItem(mainhand.name, bot.items, {
                    level: mainhand.level,
                    special: mainhand.p,
                    statType: mainhand.stat_type,
                })
                if (num !== undefined) equipBatch.push({ num, slot: "mainhand" })
            } else {
                await bot.unequip("mainhand")
            }

            if (this.options.ensureEquipped.offhand && !this.options.ensureEquipped.offhand.unequip) {
                const num = bot.locateItem(
                    this.options.ensureEquipped.offhand.name,
                    bot.items,
                    this.options.ensureEquipped.offhand.filters,
                )
                if (num !== undefined) equipBatch.push({ num, slot: "offhand" })
            } else if (offhand) {
                const num = bot.locateItem(offhand.name, bot.items, {
                    level: offhand.level,
                    special: offhand.p,
                    statType: offhand.stat_type,
                })
                if (num !== undefined) equipBatch.push({ num, slot: "offhand" })
            }

            if (equipBatch.length) await bot.equipBatch(equipBatch)
        }
    }

    protected async stomp(bot: Warrior) {
        if (this.options.enableEquipForStomp) {
            if (
                !(
                    (
                        bot.canUse("stomp", { ignoreEquipped: true }) && // We can stomp
                        (bot.isEquipped("basher") || bot.isEquipped("wbasher") || bot.hasItem(["basher", "wbasher"]))
                    ) // We have an item that can stomp
                )
            )
                return
        } else if (!bot.canUse("stomp")) return

        if (bot.isPVP()) {
            const nearby = bot.getPlayers({
                // TODO: Confirm that we can't stun party members and friends with stomp on PvP
                isFriendly: true,
                withinRange: "stomp",
            })
            if (nearby.length > 0) return
        }

        // Find all targets within range of stomp
        const entities = bot.getEntities({
            typeList: this.options.typeList,
            withinRange: "stomp",
        })
        if (entities.length == 0) return // No targets to stomp

        let mainhand: ItemData
        let offhand: ItemData
        if (this.options.enableEquipForStomp) {
            if (!bot.isEquipped(["basher", "wbasher"])) {
                // Unequip offhand if we have it
                if (bot.slots.offhand) {
                    if (bot.esize <= 0) return // We don't have an inventory slot to unequip the offhand
                    offhand = { ...bot.slots.offhand }
                    await bot.unequip("offhand")
                }
                if (bot.slots.mainhand) mainhand = { ...bot.slots.mainhand }
                await bot.equip(bot.locateItem(["basher", "wbasher"], bot.items, { returnHighestLevel: true }))
                if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms) // Await the penalty cooldown so we can stomp right away
            }
        }

        await bot.stomp().catch(suppress_errors)

        if (this.options.enableEquipForStomp) {
            // Re-equip items
            const equipBatch: { num: number; slot: SlotType }[] = []

            if (this.options.ensureEquipped.mainhand && !this.options.ensureEquipped.mainhand.unequip) {
                const num = bot.locateItem(
                    this.options.ensureEquipped.mainhand.name,
                    bot.items,
                    this.options.ensureEquipped.mainhand.filters,
                )
                if (num !== undefined) equipBatch.push({ num, slot: "mainhand" })
            } else if (mainhand) {
                const num = bot.locateItem(mainhand.name, bot.items, {
                    level: mainhand.level,
                    special: mainhand.p,
                    statType: mainhand.stat_type,
                })
                if (num !== undefined) equipBatch.push({ num, slot: "mainhand" })
            } else {
                await bot.unequip("mainhand")
            }

            if (this.options.ensureEquipped.offhand && !this.options.ensureEquipped.offhand.unequip) {
                const num = bot.locateItem(
                    this.options.ensureEquipped.offhand.name,
                    bot.items,
                    this.options.ensureEquipped.offhand.filters,
                )
                if (num !== undefined) equipBatch.push({ num, slot: "offhand" })
            } else if (offhand) {
                const num = bot.locateItem(offhand.name, bot.items, {
                    level: offhand.level,
                    special: offhand.p,
                    statType: offhand.stat_type,
                })
                if (num !== undefined) equipBatch.push({ num, slot: "offhand" })
            }

            if (equipBatch.length) await bot.equipBatch(equipBatch)
        }
    }

    protected async applyWarCry(bot: Warrior) {
        if (!bot.canUse("warcry")) return
        if (bot.s.warcry) return // We already have it applied
        if (!bot.getEntity(this.options)) return // We aren't about to attack

        return bot.warcry()
    }

    protected shouldHardshell(bot: Warrior): boolean {
        if (!bot.canUse("hardshell")) return false
        if (this.options.disableHardshell) return false

        // If we are taking a lot of damage
        let potentialIncomingDamage = 0
        for (const entity of bot.getEntities({ targetingMe: true })) {
            if (entity.damage_type !== "physical") continue // Hardshell only adds armor
            if (AL.Tools.distance(bot, entity) > entity.range + entity.speed) continue // Too far away to attack us
            potentialIncomingDamage += entity.calculateDamageRange(bot)[1]
        }
        if (potentialIncomingDamage * 3 >= bot.hp) {
            return true
        }

        return false
    }
}

export type WarriorAttackWithLuckStrategyOptions = WarriorAttackStrategyOptions & {
    /** For the given monster name, if less than hp, switch to attributes */
    switchConfig: [MonsterName, hp: number, attributes: Attribute[]][]
}

/**
 * Can be used to change equipment if we see certain monsters
 */
export class WarriorAttackWithAttributesStrategy extends WarriorAttackStrategy {
    declare public options: WarriorAttackWithLuckStrategyOptions
    public originalEnsureEquipped: EnsureEquipped

    public constructor(options?: WarriorAttackWithLuckStrategyOptions) {
        super(options)

        this.originalEnsureEquipped = structuredClone(options.ensureEquipped)
    }

    protected ensureEquipped(bot: Warrior): Promise<void> {
        if (checkOnlyEveryMS(`equip_${bot.id}`, 2_000)) {
            this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, this.options.generateEnsureEquipped))

            for (const [type, hpLessThan, attributes] of this.options.switchConfig) {
                const monster = bot.getEntity({ type, hpLessThan })
                if (!monster) continue // No monster, or not low enough HP

                // Equip with our attributes
                console.debug("DEBUG: SWITCHING TO LUCK ON", bot.id, "FOR", type)
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes }))
                break
            }

            // Equip our original equipment
            this.botEnsureEquipped.set(bot.id, this.originalEnsureEquipped)
        }
        return super.ensureEquipped(bot)
    }
}
