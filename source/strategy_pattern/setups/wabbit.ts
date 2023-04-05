import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { IDLE_ATTACK_MONSTERS } from "../strategies/attack.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_LUCK } from "./equipment.js"

const typeList: MonsterName[] = ["wabbit", ...IDLE_ATTACK_MONSTERS, "bbpompom", "wolf", "wolfie", "stompy"]

export function constructWabbitSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const wabbitMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, type: "wabbit" })

    return {
        configs: [
            {
                id: "wabbit_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: wabbitMoveStrategy
                    },
                ]
            },
            {
                id: "wabbit_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: wabbitMoveStrategy
                    },
                ]
            },
            {
                id: "wabbit_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: PRIEST_LUCK,
                            typeList: typeList,
                        }),
                        move: wabbitMoveStrategy
                    },
                ]
            },
            {
                id: "wabbit_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: wabbitMoveStrategy
                    },
                ]
            },
            {
                id: "wabbit_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: wabbitMoveStrategy
                    },
                ]
            },
            {
                id: "wabbit_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: {
                                earring2: { name: "dexearringx" },
                                orb: { name: "jacko" },
                            },
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            typeList: typeList
                        }),
                        move: wabbitMoveStrategy
                    }
                ]
            },
        ]
    }
}

export function constructWabbitHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const wabbitMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, type: "wabbit" })

    return {
        configs: [
            {
                id: "wabbit_helper_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: wabbitMoveStrategy
                    }
                ]
            },
            {
                id: "wabbit_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: wabbitMoveStrategy
                    }
                ]
            },
            {
                id: "wabbit_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: wabbitMoveStrategy
                    },
                ]
            },
            {
                id: "wabbit_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: wabbitMoveStrategy
                    }
                ]
            },
            {
                id: "wabbit_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: wabbitMoveStrategy
                    }
                ]
            },
            {
                id: "wabbit_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, typeList: typeList }),
                        move: wabbitMoveStrategy
                    }
                ]
            }
        ]
    }
}