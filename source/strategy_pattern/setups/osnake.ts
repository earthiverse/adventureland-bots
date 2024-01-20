import { MonsterName, PingCompensatedCharacter } from "alclient"
import { halloweenSafeSnakes } from "../../base/locations.js"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpreadOutImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_FAST, PRIEST_FAST, WARRIOR_SPLASH } from "./equipment.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"

const attackMonsters: MonsterName[] = ["osnake", "snake", "greenjr", "tinyp"]
const moveMonsters: MonsterName[] = ["osnake", "snake"]

export function constructOSnakeSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpreadOutImprovedMoveStrategy(moveMonsters, { idlePosition: halloweenSafeSnakes })

    return {
        configs: [
            {
                id: "osnake_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                prefer: { ...MAGE_FAST }
                            },
                            typeList: attackMonsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "osnake_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                prefer: { ...PRIEST_FAST }
                            },
                            typeList: attackMonsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "osnake_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            typeList: attackMonsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "osnake_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                prefer: { ...WARRIOR_SPLASH }
                            },
                            typeList: attackMonsters
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}

export function constructOSnakeHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpreadOutImprovedMoveStrategy(moveMonsters, { idlePosition: halloweenSafeSnakes })

    return {
        configs: [
            {
                id: "osnake_helper_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: moveMonsters }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "osnake_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: moveMonsters }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "osnake_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: moveMonsters,
                        }),
                        move: moveStrategy
                    },
                ]
            },
            {
                id: "osnake_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: moveMonsters }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "osnake_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: moveMonsters }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "osnake_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, typeList: moveMonsters }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}