import AL, { Character, Entity, GetEntityFilters, IPosition, Mage, MonsterName, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { Strategist, filterContexts } from "../context.js"
import { MageAttackStrategy, MageAttackStrategyOptions } from "../strategies/attack_mage.js"
import { PriestAttackStrategy, PriestAttackStrategyOptions } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy, WarriorAttackStrategyOptions } from "../strategies/attack_warrior.js"
import { KiteMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base.js"
import { RETURN_HIGHEST } from "./equipment.js"
import { offsetPositionParty } from "../../base/locations.js"
import { suppress_errors } from "../logging.js"

const CRYPT_MONSTERS: MonsterName[] = ["zapper0", "vbat", "nerfedbat", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"]
const CRYPT_PRIORITY: MonsterName[] = ["a5", "a6", "a8", "a3", "a2", "a7", "a4", "a1", "vbat"]

class CryptMoveStratey extends KiteMonsterMoveStrategy {
    public constructor(contexts: Strategist<PingCompensatedCharacter>[]) {
        super({
            contexts: contexts,
            ignoreMaps: ["cave"],
            typeList: CRYPT_MONSTERS
        })

        // Only include crypt map positions
        this.spawns = this.spawns.filter(p => p.map === "crypt")
    }

    protected async move(bot: Character): Promise<IPosition> {
        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }

        for (const type of CRYPT_PRIORITY) {
            filter.type = type as MonsterName

            // Check for the entity in all of the contexts
            let entity: Entity
            for (const context of filterContexts(this.options.contexts, { serverData: bot.serverData })) {
                const friend = context.bot
                if (friend.map !== bot.map) continue

                entity = friend.getEntity(filter)
                if (entity) break
            }
            if (!entity) continue

            /**
             * a1 (Spike) - Spawns nerfedbats, stay close to do splash damage
             * a4 (Orlok) - Spawns zapper0s, stay close to do splash damage
             * a5 (Elena) - Partners up with, and heals other crypt monsters, stay close to not damage others
             */
            if (entity.type == "a5") {
                if (entity.focus && entity.focus !== entity.id) {
                    // Stay on a5 to kill
                    bot.smartMove(offsetPositionParty(entity, bot)).catch(suppress_errors)
                } else {
                    // Kite to another monster
                    this.kite(bot, entity).catch(suppress_errors)
                }
            } else if (entity.type == "a1" || entity.type == "a4" || entity.type == "vbat") {
                bot.smartMove(offsetPositionParty(entity, bot)).catch(suppress_errors)
            } else {
                this.kite(bot, entity).catch(suppress_errors)
            }
            return
        }


        return super.move(bot) // Go find an entity
    }
}

class MageCryptAttackStrategy extends MageAttackStrategy {
    public constructor(options?: MageAttackStrategyOptions) {
        super(options)

        this.options.ensureEquipped = {
            amulet: { name: "intamulet", filters: RETURN_HIGHEST },
            belt: { name: "intbelt", filters: RETURN_HIGHEST },
            cape: { name: "tigercape", filters: RETURN_HIGHEST },
            chest: { name: "harmor", filters: RETURN_HIGHEST },
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
            gloves: { name: "hgloves", filters: RETURN_HIGHEST },
            helmet: { name: "hhelmet", filters: RETURN_HIGHEST },
            mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            offhand: { name: "wbookhs", filters: RETURN_HIGHEST },
            orb: { name: "jacko", filters: RETURN_HIGHEST },
            pants: { name: "hpants", filters: RETURN_HIGHEST },
            ring1: { name: "cring", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
            shoes: { name: "vboots", filters: RETURN_HIGHEST },
        }
    }

    protected async attack(bot: Mage): Promise<void> {
        const nearbyEntities = bot.getEntities({ withinRange: Math.max(bot.range, 250) })
        if (nearbyEntities.length && nearbyEntities.every(e => (e.type === "a1" || e.type === "nerfedbat" || e.type == "vbat"))) {
            // Disable scare if only a1 is around and we have a lot of hp
            this.options.disableScare = bot.hp > (bot.max_hp / 2) ? true : undefined
            delete this.options.maximumTargets
        } else {
            // Opposite of what is above
            delete this.options.disableScare
            this.options.maximumTargets = 1
        }

        const nearbyPriest = bot.getPlayer({ ctype: "priest", isPartyMember: true, withinRangeOf: bot })

        // Reset options
        delete this.options.type
        delete this.options.typeList

        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }
        for (const type of CRYPT_PRIORITY) {
            filter.type = type
            const entity = bot.getEntity(filter)
            if (!entity) continue // This entity isn't around

            if (
                !nearbyPriest
                && bot.hp < bot.max_hp / 2
                && entity.target == bot.id
            ) {
                if (bot.canUse("scare")) await bot.scare()
                return
            }

            if (type == "a1") {
                this.options.typeList = ["a1", "nerfedbat"]
                return super.attack(bot)
            }

            if (type == "a4") {
                this.options.typeList = ["a4", "zapper0"]
                this.options.maximumTargets = 2

                // Scare zapper0s if they're only targeting us
                const zapper0s = bot.getEntities({ type: "zapper0" })
                if (zapper0s.length && zapper0s.every(e => e.target == bot.id) && bot.canUse("scare")) {
                    for (const zapper0 of zapper0s) this.preventOverkill(bot, zapper0)
                    await bot.scare()
                }

                return super.attack(bot)
            }

            this.options.type = type
            return super.attack(bot)
        }

        return super.attack(bot)
    }
}

class PriestCryptAttackStrategy extends PriestAttackStrategy {
    public constructor(options?: PriestAttackStrategyOptions) {
        super(options)

        this.options.ensureEquipped = {
            amulet: { name: "intamulet", filters: RETURN_HIGHEST },
            belt: { name: "intbelt", filters: RETURN_HIGHEST },
            cape: { name: "angelwings", filters: RETURN_HIGHEST },
            chest: { name: "harmor", filters: RETURN_HIGHEST },
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
            gloves: { name: "xgloves", filters: RETURN_HIGHEST },
            helmet: { name: "hhelmet", filters: RETURN_HIGHEST },
            mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            offhand: { name: "tigershield", filters: RETURN_HIGHEST },
            orb: { name: "jacko", filters: RETURN_HIGHEST },
            pants: { name: "hpants", filters: RETURN_HIGHEST },
            ring1: { name: "cring", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
            shoes: { name: "hboots", filters: RETURN_HIGHEST },
        }
    }

    protected async attack(bot: Priest): Promise<void> {
        const nearbyEntities = bot.getEntities({ withinRange: Math.max(bot.range, 250) })
        if (nearbyEntities.length && nearbyEntities.every(e => (e.type === "a1" || e.type === "nerfedbat" || e.type === "vbat"))) {
            // Disable scare if only a1 is around and we have a lot of hp
            this.options.disableScare = bot.hp > (bot.max_hp / 2) ? true : undefined
            delete this.options.maximumTargets
        } else {
            // Opposite of what is above
            delete this.options.disableScare
            this.options.maximumTargets = 1
        }

        // Reset options
        delete this.options.type
        delete this.options.typeList

        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }
        for (const type of CRYPT_PRIORITY) {
            filter.type = type
            const entity = bot.getEntity(filter)
            if (!entity) continue // This entity isn't around

            if (type == "a1") {
                this.options.typeList = ["a1", "nerfedbat"]
                return super.attack(bot)
            }

            if (type == "a4") {
                this.options.typeList = ["a4", "zapper0"]
                this.options.maximumTargets = 2

                // Scare zapper0s if they're only targeting us
                const zapper0s = bot.getEntities({ type: "zapper0" })
                if (zapper0s.length && bot.canUse("scare")) {
                    if (zapper0s.every(e => e.target == bot.id)) {
                        // Every zapper0 is targeting us
                        for (const zapper0 of zapper0s) this.preventOverkill(bot, zapper0)
                        await bot.scare()
                    } else if (
                        zapper0s.every(e => e.target == zapper0s[0].target)
                        && bot.mp >= (AL.Game.G.skills.absorb.mp + AL.Game.G.skills.scare.mp)
                    ) {
                        // Every zapper0 is targeting one player
                        for (const zapper0 of zapper0s) this.preventOverkill(bot, zapper0)
                        await bot.absorbSins(zapper0s[0].target)
                        await bot.scare()
                    }
                }

                return super.attack(bot)
            }

            this.options.type = type
            return super.attack(bot)
        }

        return super.attack(bot)
    }
}

class WarriorCryptAttackStrategy extends WarriorAttackStrategy {
    public constructor(options?: WarriorAttackStrategyOptions) {
        super(options)

        this.options.ensureEquipped = {
            amulet: { name: "snring", filters: RETURN_HIGHEST },
            belt: { name: "strbelt", filters: RETURN_HIGHEST },
            cape: { name: "bcape", filters: RETURN_HIGHEST },
            chest: { name: "xarmor", filters: RETURN_HIGHEST },
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
            gloves: { name: "xgloves", filters: RETURN_HIGHEST },
            helmet: { name: "xhelmet", filters: RETURN_HIGHEST },
            mainhand: { name: "vhammer", filters: RETURN_HIGHEST },
            offhand: { name: "ololipop", filters: RETURN_HIGHEST },
            pants: { name: "xpants", filters: RETURN_HIGHEST },
            ring1: { name: "strring", filters: RETURN_HIGHEST },
            ring2: { name: "strring", filters: RETURN_HIGHEST },
            shoes: { name: "vboots", filters: RETURN_HIGHEST },
        }
    }

    protected async attack(bot: Warrior): Promise<void> {
        const nearbyEntities = bot.getEntities({ withinRange: Math.max(bot.range, 250) })
        if (nearbyEntities.length && nearbyEntities.every(e => (e.type === "a1" || e.type === "nerfedbat" || e.type === "vbat"))) {
            // Disable scare if only a1 is around and we have a lot of hp
            this.options.disableScare = bot.hp > (bot.max_hp / 2) ? true : undefined
            delete this.options.maximumTargets
            delete this.options.enableGreedyAggro

            // Equip splpash weapon if only a1 is around
            this.options.ensureEquipped.mainhand = { name: "vhammer", filters: RETURN_HIGHEST }
            this.options.ensureEquipped.offhand = { name: "ololipop", filters: RETURN_HIGHEST }
        } else {
            // Opposite of what is above
            delete this.options.disableScare
            this.options.maximumTargets = 1
            delete this.options.enableGreedyAggro

            this.options.ensureEquipped.mainhand = { name: "fireblade", filters: RETURN_HIGHEST }
            this.options.ensureEquipped.offhand = { name: "fireblade", filters: RETURN_HIGHEST }
        }

        const nearbyPriest = bot.getPlayer({ ctype: "priest", isPartyMember: true, withinRangeOf: bot })

        // Reset options
        delete this.options.type
        delete this.options.typeList

        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }
        for (const type of CRYPT_PRIORITY) {
            filter.type = type
            const entity = bot.getEntity(filter)
            if (!entity) continue // This entity isn't around

            if (
                !nearbyPriest
                && bot.hp < bot.max_hp / 2
                && entity.target == bot.id
            ) {
                if (bot.canUse("scare")) await bot.scare()
                return
            }

            if (type == "a1") {
                this.options.typeList = ["a1", "nerfedbat"]
                return super.attack(bot)
            }

            if (type == "a4") {
                this.options.typeList = ["a4", "zapper0"]
                this.options.maximumTargets = 2

                // Scare zapper0s if they're only targeting us
                const zapper0s = bot.getEntities({ type: "zapper0" })
                if (zapper0s.length && bot.canUse("scare")) {
                    if (zapper0s.every(e => e.target == bot.id)) {
                        // Every zapper0 is targeting us
                        for (const zapper0 of zapper0s) this.preventOverkill(bot, zapper0)
                        await bot.scare()
                    } else if (bot.mp >= (AL.Game.G.skills.agitate.mp + AL.Game.G.skills.scare.mp)) {
                        // Get all targets on us, then scare
                        for (const zapper0 of zapper0s) this.preventOverkill(bot, zapper0)
                        await bot.agitate()
                        await bot.scare()
                    }
                }

                return super.attack(bot)
            }

            this.options.type = type
            return super.attack(bot)
        }

        return super.attack(bot)
    }
}

export function constructCryptSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new CryptMoveStratey(contexts)

    return {
        configs: [
            {
                id: "crypt_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageCryptAttackStrategy({
                            contexts: contexts,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestCryptAttackStrategy({
                            contexts: contexts,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorCryptAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}
