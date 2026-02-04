import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy, MageAttackWithAttributesStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy, PriestAttackWithAttributesStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy, WarriorAttackWithAttributesStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_FAST, PRIEST_FAST, RETURN_HIGHEST, UNEQUIP } from "./equipment.js"
import { IDLE_ATTACK_MONSTERS } from "../strategies/attack.js"

const typeList: MonsterName[] = ["pinkgoo"]

export function constructPinkGooSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const pinkgooMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: typeList })

    return {
        configs: [
            {
                id: "pinkgoo_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackWithAttributesStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                prefer: { ...MAGE_FAST },
                            },
                            typeList: [...typeList, ...IDLE_ATTACK_MONSTERS],
                            switchConfig: [
                                [
                                    "pinkgoo",
                                    5,
                                    {
                                        attributes: ["luck"],
                                    },
                                ],
                            ],
                        }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            typeList: [...typeList, ...IDLE_ATTACK_MONSTERS],
                        }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackWithAttributesStrategy({
                            contexts: contexts,
                            enableAbsorbToTank: true,
                            generateEnsureEquipped: {
                                prefer: { ...PRIEST_FAST },
                            },
                            typeList: [...typeList, ...IDLE_ATTACK_MONSTERS],
                            switchConfig: [
                                [
                                    "pinkgoo",
                                    5,
                                    {
                                        attributes: ["luck"],
                                    },
                                ],
                            ],
                        }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            typeList: [...typeList, ...IDLE_ATTACK_MONSTERS],
                        }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            typeList: [...typeList, ...IDLE_ATTACK_MONSTERS],
                        }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackWithAttributesStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["frequency"],
                                prefer: {
                                    mainhand: { name: "rapier", filters: RETURN_HIGHEST },
                                    offhand: UNEQUIP,
                                },
                            },
                            typeList: [...typeList, ...IDLE_ATTACK_MONSTERS],
                            switchConfig: [
                                [
                                    "pinkgoo",
                                    5,
                                    {
                                        attributes: ["luck"],
                                        prefer: {
                                            mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
                                            offhand: { name: "mshield", filters: RETURN_HIGHEST },
                                        },
                                    },
                                ],
                            ],
                        }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
        ],
    }
}

export function constructPinkGooHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const pinkgooMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: typeList })

    return {
        configs: [
            {
                id: "pinkgoo_helper_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
            {
                id: "pinkgoo_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            typeList: typeList,
                        }),
                        move: pinkgooMoveStrategy,
                    },
                ],
            },
        ],
    }
}
