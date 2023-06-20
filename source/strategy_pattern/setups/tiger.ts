import { Entity, MonsterName, PingCompensatedCharacter, Priest } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { sortPriority } from "../../base/sort.js"
import { Strategist } from "../context.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { UNEQUIP_EVERYTHING } from "./equipment.js"
import { suppress_errors } from "../logging.js"

const typeList: MonsterName[] = ["tiger"]

class PriestTigerHealStrategy extends PriestAttackStrategy {
    protected async attack(bot: Priest): Promise<void> {
        await this.healFriendsOrSelf(bot)
        if (!this.options.disableDarkBlessing) this.applyDarkBlessing(bot)

        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot).catch(suppress_errors)
            return
        }

        const priority = this.sort.get(bot.id)

        await this.ensureEquipped(bot)

        if (!this.options.disableBasicAttack) await this.basicHeal(bot, priority)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority)

        await this.ensureEquipped(bot)
    }

    protected async basicHeal(bot: Priest, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("heal")) return // We can't attack

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "heal",
            withinRange: "heal"
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

            return bot.healSkill(target.id).catch(console.error)
        }
    }
}

export function constructTigerSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const tigerMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: typeList })

    return {
        configs: [
            {
                id: "tiger_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: {
                                ...UNEQUIP_EVERYTHING,
                                earring2: { name: "dexearringx" },
                                orb: { name: "jacko" },
                            },
                            typeList: typeList
                        }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...UNEQUIP_EVERYTHING },
                            typeList: typeList,
                        }),
                        move: tigerMoveStrategy
                    },
                ]
            },
            {
                id: "tiger_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...UNEQUIP_EVERYTHING },
                            typeList: typeList,
                        }),
                        move: tigerMoveStrategy
                    },
                ]
            },
            {
                id: "tiger_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestTigerHealStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: tigerMoveStrategy
                    },
                ]
            },
        ]
    }
}

export function constructTigerHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const tigerMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: typeList })

    return {
        configs: [
            {
                id: "tiger_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            // {
            //     id: "tiger_helper_priest",
            //     characters: [
            //         {
            //             ctype: "priest",
            //             attack: new PriestTigerHealStrategy({
            //                 contexts: contexts,
            //                 typeList: typeList,
            //             }),
            //             move: tigerMoveStrategy
            //         },
            //     ]
            // },
            {
                id: "tiger_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, enableEquipForCleave: true, enableEquipForStomp: true, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            }
        ]
    }
}