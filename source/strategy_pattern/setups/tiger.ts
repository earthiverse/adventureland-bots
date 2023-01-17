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
import { UNEQUIP_EVERYTHING } from "./equipment.js"

export function constructTigerSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const tigerMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, type: "tiger" })
    const typeList: MonsterName[] = ["tiger"]

    return {
        configs: [
            {
                id: "tiger_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...UNEQUIP_EVERYTHING },
                            typeList: typeList
                        }),
                        move: tigerMoveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...UNEQUIP_EVERYTHING },
                            typeList: typeList,
                        }),
                        move: tigerMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...UNEQUIP_EVERYTHING },
                            typeList: typeList
                        }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...UNEQUIP_EVERYTHING },
                            typeList: typeList,
                        }),
                        move: tigerMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...UNEQUIP_EVERYTHING },
                            typeList: typeList
                        }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
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
        ]
    }
}

export function constructTigerHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const tigerMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, type: "tiger" })
    const typeList: MonsterName[] = ["tiger"]

    return {
        configs: [
            {
                id: "tiger_helper_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, ensureEquipped: { ...UNEQUIP_EVERYTHING }, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, ensureEquipped: { ...UNEQUIP_EVERYTHING }, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, ensureEquipped: { ...UNEQUIP_EVERYTHING }, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, ensureEquipped: { ...UNEQUIP_EVERYTHING }, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, ensureEquipped: { ...UNEQUIP_EVERYTHING }, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            },
            {
                id: "tiger_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, enableEquipForCleave: true, enableEquipForStomp: true, ensureEquipped: { ...UNEQUIP_EVERYTHING }, typeList: typeList }),
                        move: tigerMoveStrategy
                    }
                ]
            }
        ]
    }
}