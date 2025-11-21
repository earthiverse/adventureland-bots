import AL, { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, ImprovedMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH_WEAPONS, MP_RECOVERY, RETURN_HIGHEST, WARRIOR_SPLASH_WEAPONS } from "./equipment.js"

export function constructXScorpionSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("xscorpion")[0]
    const monsters: MonsterName[] = ["xscorpion", "tinyp", "mechagnome"] // TODO: Mechagnome temporarily for Crown

    const moveInCircleStrategy = new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 })
    const moveStrategy = new ImprovedMoveStrategy("xscorpion")

    return {
        configs: [
            {
                id: "greedy_xscorpion_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                prefer: {
                                    ...MAGE_SPLASH_WEAPONS,
                                    ...MP_RECOVERY,
                                },
                            },
                            targetingPartyMember: true,
                            typeList: monsters,
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: 5 } }),
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            typeList: monsters,
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: -5 } }),
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                prefer: {
                                    ...WARRIOR_SPLASH_WEAPONS,
                                    ...MP_RECOVERY,
                                    orb: { name: "orbofstr", filters: RETURN_HIGHEST },
                                },
                            },
                            typeList: monsters,
                        }),
                        move: moveInCircleStrategy,
                    },
                ],
            },
            {
                id: "greedy_xscorpion_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            typeList: monsters,
                        }),
                        move: new HoldPositionMoveStrategy(spawn),
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "explosion", "blast"],
                            },
                            typeList: monsters,
                        }),
                        move: moveInCircleStrategy,
                    },
                ],
            },
            {
                id: "xscorpion_mage,priest",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack", "blast", "explosion"],
                            },
                            targetingPartyMember: true,
                            typeList: monsters,
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            typeList: monsters,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
