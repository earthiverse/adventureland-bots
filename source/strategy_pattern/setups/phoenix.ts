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
import { MAGE_NORMAL, PRIEST_LUCK, WARRIOR_NORMAL } from "./equipment.js"

const phoenixMoveStrategy = new SpecialMonsterMoveStrategy({ type: "phoenix" })
const typeList: MonsterName[] = ["phoenix"]

export function constructPhoenixSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "phoenix_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...MAGE_NORMAL },
                            typeList: typeList
                        }),
                        move: phoenixMoveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_LUCK },
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...WARRIOR_NORMAL },
                            typeList: typeList
                        }),
                        move: phoenixMoveStrategy
                    }
                ]
            },
            {
                id: "phoenix_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_LUCK },
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...WARRIOR_NORMAL },
                            typeList: typeList
                        }),
                        move: phoenixMoveStrategy
                    }
                ]
            },
            {
                id: "phoenix_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy
                    },
                ]
            },
            {
                id: "phoenix_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy
                    },
                ]
            },
        ]
    }
}

export function constructPhoenixHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "phoenix_helper_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: phoenixMoveStrategy
                    }
                ]
            },
            {
                id: "phoenix_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: phoenixMoveStrategy
                    }
                ]
            },
            {
                id: "phoenix_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, typeList: typeList }),
                        move: phoenixMoveStrategy
                    }
                ]
            },
            {
                id: "phoenix_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: phoenixMoveStrategy
                    }
                ]
            },
            {
                id: "phoenix_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: typeList }),
                        move: phoenixMoveStrategy
                    }
                ]
            },
            {
                id: "phoenix_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, enableEquipForCleave: true, enableEquipForStomp: true, typeList: typeList }),
                        move: phoenixMoveStrategy
                    }
                ]
            }
        ]
    }
}