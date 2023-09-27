import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

const typeList: MonsterName[] = ["grinch"]

export function constructGrinchSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const grinchMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, ignoreMaps: ["bank", "bank_b", "bank_u", "hut", "woffice"], typeList: typeList })

    return {
        configs: [
            {
                id: "grinch_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList
                        }),
                        move: grinchMoveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                        }),
                        move: grinchMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                        }),
                        move: grinchMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
        ]
    }
}

export function constructGrinchHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const grinchMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, ignoreMaps: ["bank", "bank_b", "bank_u", "hut", "woffice"], typeList: typeList })

    return {
        configs: [
            {
                id: "grinch_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableAbsorb: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            }
        ]
    }
}