import { Character, GetEntityFilters, IPosition, Mage, MonsterName, PingCompensatedCharacter, Priest, Warrior } from "alclient"
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

        for (const type of ["vbat", "a5", "a6", "a8", "a3", "a2", "a7", "a4", "a1"]) {
            filter.type = type as MonsterName
            const entity = bot.getEntity(filter)
            if (!entity) continue

            /**
             * a1 (Spike) - Spawns nerfedbats, stay close to do splash damage
             * a4 (Orlok) - Spawns zapper0s, stay close to do splash damage
             * a5 (Elena) - Partners up with, and heals other crypt monsters, stay close to not damage others
             */
            if (entity.type == "a1" || entity.type == "a4" || entity.type == "a5") {
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
            offhand: { name: "lantern", filters: RETURN_HIGHEST },
            pants: { name: "hpants", filters: RETURN_HIGHEST },
            ring1: { name: "cring", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
            shoes: { name: "vboots", filters: RETURN_HIGHEST },
        }
    }

    protected async attack(bot: Mage): Promise<void> {
        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }

        for (const type of (["a5", "a6", "a8", "a3", "a2", "a7", "vbat", "a4", "a1"] as MonsterName[])) {
            filter.type = type
            const entity = bot.getEntity(filter)
            if (entity) {
                this.options.maximumTargets = (type === "a1" ? undefined : 1)
                if (type == "a1") {
                    this.options.ensureEquipped.mainhand = { name: "gstaff", filters: RETURN_HIGHEST }
                    delete this.options.ensureEquipped.offhand
                    this.options.ensureEquipped.orb = { name: "orbofint", filters: RETURN_HIGHEST }
                    this.options.hasTarget = true
                    this.options.maximumTargets = 10
                    delete this.options.type
                    this.options.typeList = ["a1", "nerfedbat"]
                } else if (type == "a4") {
                    this.options.ensureEquipped.mainhand = { name: "gstaff", filters: RETURN_HIGHEST }
                    delete this.options.ensureEquipped.offhand
                    this.options.ensureEquipped.orb = { name: "jacko", filters: RETURN_HIGHEST }
                    this.options.hasTarget = true
                    this.options.maximumTargets = 0
                    delete this.options.type
                    this.options.typeList = ["zapper0", "a4"]

                    for (const zapper0 of bot.getEntities({ type: "zapper0" })) {
                        if (zapper0.target === bot.id) {
                            await this.scare(bot)
                            break
                        }
                    }
                } else {
                    if (
                        type === "a5"
                        && (
                            !entity.focus
                            || entity.focus == entity.id
                        )
                    ) {
                        // We only want to attack a5 (Elena) when it's focusing on (healing) something else
                        continue
                    }

                    this.options.ensureEquipped.mainhand = { name: "firestaff", filters: RETURN_HIGHEST }
                    this.options.ensureEquipped.offhand = { name: "lantern", filters: RETURN_HIGHEST }
                    this.options.ensureEquipped.orb = { name: "orbofint", filters: RETURN_HIGHEST }
                    delete this.options.hasTarget
                    this.options.maximumTargets = 1
                    this.options.type = type
                    delete this.options.typeList
                }
                return super.attack(bot)
            }
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
            pants: { name: "hpants", filters: RETURN_HIGHEST },
            ring1: { name: "cring", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
            shoes: { name: "hboots", filters: RETURN_HIGHEST },
        }
    }

    protected async attack(bot: Priest): Promise<void> {
        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }

        for (const type of (["a5", "a6", "a8", "a3", "a2", "a7", "vbat", "a4", "a1",] as MonsterName[])) {
            filter.type = type
            const entity = bot.getEntity(filter)
            if (entity) {
                this.options.maximumTargets = (type === "a1" ? undefined : 1)
                if (type == "a1") {
                    this.options.ensureEquipped.orb = { name: "tigerstone", filters: RETURN_HIGHEST }
                    this.options.maximumTargets = 10
                    delete this.options.type
                    this.options.typeList = ["a1", "nerfedbat"]
                } else if (type == "a4") {
                    this.options.ensureEquipped.orb = { name: "jacko", filters: RETURN_HIGHEST }
                    this.options.maximumTargets = 1
                    delete this.options.type
                    this.options.typeList = ["zapper0", "a4"]

                    const zappers = bot.getEntities({ type: "zapper0" })
                    zapper:
                    for (const zapper0 of zappers) {
                        if (bot.canUse("absorb")) {
                            for (const friendContext of filterContexts(this.options.contexts)) {
                                const friend = friendContext.bot
                                if (friend.id === bot.id) continue
                                if (zapper0.target !== friend.id) continue
                                if (
                                    friend.canUse("scare")
                                    || (
                                        friend.canUse("scare", { ignoreEquipped: true })
                                        && friend.hasItem("jacko")
                                    )
                                ) {
                                    // They can scare themselves
                                    continue
                                }

                                // Take the target and scare
                                await bot.absorbSins(friend.id)
                                await this.scare(bot)
                                break zapper
                            }
                        }
                    }

                    for (const zapper0 of zappers) {
                        if (zapper0.target === bot.id) {
                            await this.scare(bot)
                            break
                        }
                    }
                } else {
                    if (
                        type === "a5"
                        && (
                            !entity.focus
                            || entity.focus == entity.id
                        )
                    ) {
                        // We only want to attack a5 (Elena) when it's focusing on (healing) something else
                        continue
                    }

                    this.options.ensureEquipped.orb = { name: "tigerstone", filters: RETURN_HIGHEST }
                    this.options.maximumTargets = 1
                    this.options.type = type
                    delete this.options.typeList
                }
                return super.attack(bot)
            }
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
        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }

        for (const type of (["a5", "a6", "a8", "a3", "a2", "a7", "vbat", "a4", "a1"] as MonsterName[])) {
            filter.type = type
            const entity = bot.getEntity(filter)
            if (entity) {
                this.options.maximumTargets = (type === "a1" ? undefined : 1)
                if (type == "a1") {
                    this.options.ensureEquipped.mainhand =  { name: "vhammer", filters: RETURN_HIGHEST }
                    this.options.ensureEquipped.offhand = { name: "ololipop", filters: RETURN_HIGHEST }
                    this.options.ensureEquipped.orb = { name: "orbofstr", filters: RETURN_HIGHEST }
                    this.options.maximumTargets = 10
                    delete this.options.type
                    this.options.typeList = ["a1", "nerfedbat"]
                } else if (type == "a4") {
                    this.options.ensureEquipped.mainhand =  { name: "fireblade", filters: RETURN_HIGHEST }
                    this.options.ensureEquipped.offhand = { name: "fireblade", filters: RETURN_HIGHEST }
                    this.options.ensureEquipped.orb = { name: "jacko", filters: RETURN_HIGHEST }
                    this.options.maximumTargets = 1
                    delete this.options.type
                    this.options.typeList = ["zapper0", "a4"]

                    zapper:
                    for (const zapper0 of bot.getEntities({ type: "zapper0" })) {
                        if (zapper0.target === bot.id) {
                            await this.scare(bot)
                            break zapper
                        }

                        if (!bot.canUse("agitate")) continue

                        for (const friendContext of filterContexts(this.options.contexts)) {
                            const friend = friendContext.bot
                            if (zapper0.target !== friend.id) continue
                            if (
                                friend.canUse("scare")
                                || (
                                    friend.canUse("scare", { ignoreEquipped: true })
                                    && friend.hasItem("jacko")
                                )
                            ) {
                                // They can scare themselves
                                continue
                            }

                            // Take the target(s) and scare
                            await bot.agitate()
                            await this.scare(bot)
                            break zapper
                        }
                    }
                } else {
                    if (
                        type === "a5"
                        && (
                            !entity.focus
                            || entity.focus == entity.id
                        )
                    ) {
                        // We only want to attack a5 (Elena) when it's focusing on (healing) something else
                        continue
                    }

                    this.options.ensureEquipped.mainhand =  { name: "fireblade", filters: RETURN_HIGHEST }
                    this.options.ensureEquipped.offhand = { name: "fireblade", filters: RETURN_HIGHEST }
                    this.options.ensureEquipped.orb = { name: "orbofstr", filters: RETURN_HIGHEST }
                    this.options.maximumTargets = 1
                    this.options.type = type
                    delete this.options.typeList
                }
                return super.attack(bot)
            }
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
