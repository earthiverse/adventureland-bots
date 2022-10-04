import { ItemData, Warrior } from "alclient"
import { sleep } from "../../base/general.js"
import { sortPriority } from "../../base/sort.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./attack.js"

export type WarriorAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableAgitate?: true
    disableCleave?: true
    disableWarCry?: true
    /**
     * If true, we will swap weapons to one that can cleave, cleave, and then swap back.
     *
     * NOTE: It's possible that things can fail, and you will be left holding the item that can cleave
     */
    enableEquipForCleave?: true
}

export class WarriorAttackStrategy extends BaseAttackStrategy<Warrior> {
    public options: WarriorAttackStrategyOptions

    public constructor(options?: WarriorAttackStrategyOptions) {
        super(options)

        if (!options.disableCleave) this.interval.push("cleave")
        if (!options.disableWarCry) this.interval.push("warcry")

        this.loops.set("attack", {
            fn: async (bot: Warrior) => {
                if (!this.shouldAttack(bot)) return
                await this.attack(bot)
            },
            interval: this.interval
        })
    }

    protected async attack(bot: Warrior) {
        if (!this.options.disableWarCry) this.applyWarCry(bot)

        if (!this.shouldAttack(bot)) return

        const priority = sortPriority(bot, this.options.typeList)

        await this.ensureEquipped(bot)

        if (!this.options.disableAgitate) this.agitateTargets(bot)
        await this.basicAttack(bot, priority)
        if (!this.options.disableCleave) await this.cleave(bot)

        await this.ensureEquipped(bot)
    }

    protected async agitateTargets(bot: Warrior) {
        if (!bot.canUse("agitate")) return // Can't agitate

        if (this.options.enableGreedyAggro) {
            // Agitate all nearby enemies if there are no others nearby
            const unwantedEntity = bot.getEntity({
                hasTarget: false,
                notType: this.options.type,
                notTypeList: this.options.typeList,
                withinRange: "agitate"
            })
            if (unwantedEntity) return // Something we don't want to agitate is nearby
            const wantedEntity = bot.getEntity({
                hasTarget: false,
                type: this.options.type,
                typeList: this.options.typeList,
                withinRange: "agitate"
            })
            if (wantedEntity) return bot.agitate()
        }
    }

    protected async cleave(bot: Warrior) {
        if (this.options.enableEquipForCleave) {
            if (
                !(
                    bot.canUse("cleave", { ignoreEquipped: true }) // We can cleave
                    && (bot.isEquipped("bataxe") || bot.isEquipped("scythe") || bot.hasItem(["bataxe", "scythe"])) // We have an item that can cleave
                )
            ) return
        } else if (!bot.canUse("cleave")) return

        if (bot.isPVP()) {
            const nearby = bot.getPlayers({
                // TODO: Confirm that we can't do damage to party members and friends with cleave on PvP
                isFriendly: true,
                withinRange: "cleave"
            })
            if (nearby.length > 0) return
        }

        // Find all targets within range of cleave
        const entities = bot.getEntities({
            withinRange: "cleave",
            canDamage: "cleave"
        })
        if (entities.length == 0) return // No targets to attack

        // Calculate how much courage we have left to spare
        const targetingMe = bot.calculateTargets()

        let newTargets = 0

        for (const entity of entities) {
            if ((this.options.targetingPartyMember && !entity.target)
                || (this.options.targetingPlayer && !entity.target)) {
                // We want to avoid aggro
                return
            }
            if ((this.options.type && entity.type !== this.options.type)
                || (this.options.typeList && !this.options.typeList.includes(entity.type))) {
                // We don't want to attack something that's within cleave range
                return
            }

            // Calculate the new fear if we cleave
            if (entity.target) continue // It won't change our fear
            if (bot.canKillInOneShot(entity, "cleave")) continue // It won't change our fear
            switch (entity.damage_type) {
                case "magical":
                    if (bot.mcourage > targetingMe.magical) targetingMe.magical += 1 // We can tank one more magical monster
                    else return // We can't tank any more, don't cleave
                    break
                case "physical":
                    if (bot.courage > targetingMe.physical) targetingMe.physical += 1 // We can tank one more physical monster
                    else return // We can't tank any more, don't cleave
                    break
                case "pure":
                    if (bot.pcourage > targetingMe.pure) targetingMe.pure += 1 // We can tank one more pure monster
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
            if (!(bot.isEquipped(["bataxe", "scythe"]))) {
                // Unequip offhand if we have it
                if (bot.slots.offhand) {
                    if (bot.esize == 0) return // We don't have an inventory slot to unequip the offhand
                    offhand = { ...bot.slots.offhand }
                    await bot.unequip("offhand")
                }
                if (bot.slots.mainhand) mainhand = { ...bot.slots.mainhand }
                await bot.equip(bot.locateItem(["bataxe", "scythe"], bot.items, { returnHighestLevel: true }))
                if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms) // Await the penalty cooldown so we can cleave right away
            }
        }

        await bot.cleave().catch(console.error)

        if (this.options.enableEquipForCleave) {
            // Re-equip items
            if (mainhand) {
                await bot.equip(bot.locateItem(mainhand.name, bot.items, { level: mainhand.level, special: mainhand.p }))
            } else {
                await bot.unequip("mainhand")
            }

            if (offhand) {
                await bot.equip(bot.locateItem(offhand.name, bot.items, { level: offhand.level, special: offhand.p, statType: offhand.stat_type }))
            }
        }
    }

    protected async applyWarCry(bot: Warrior) {
        if (!bot.canUse("warcry")) return
        if (bot.s.warcry) return // We already have it applied
        if (!bot.getEntity(this.options)) return // We aren't about to attack

        bot.warcry().catch(console.error)
    }
}