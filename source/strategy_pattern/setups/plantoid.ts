import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, KiteMonsterMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Requirements, Setup } from "./base"

export function constructPlantoidSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const requirements: Requirements = {
        items: ["jacko"],
        range: AL.Game.G.monsters.plantoid.range + 50,
        speed: AL.Game.G.monsters.plantoid.charge
    }
    const kiteMoveStrategy = new KiteMonsterMoveStrategy({ contexts: contexts, disableCheckDB: true, typeList: ["plantoid"] })
    const spawn = AL.Pathfinder.locateMonster("plantoid")[0]

    return {
        configs: [
            {
                id: "greedy_plantoid_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "explosion", "blast"],
                            },
                            targetingPartyMember: true,
                            type: "plantoid"
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: 5 } })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            type: "plantoid",
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: -5 } })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            // Porcupines are too close
                            disableAgitate: true,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "explosion", "blast"],
                            },
                            targetingPartyMember: true,
                            type: "plantoid"
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 })
                    }
                ]
            },
            {
                id: "plantoid_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            maximumTargets: 1,
                            type: "plantoid"
                        }),
                        move: kiteMoveStrategy,
                        require: requirements
                    },
                ]
            },
            {
                id: "plantoid_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            type: "plantoid",
                        }),
                        move: kiteMoveStrategy,
                        require: requirements
                    },
                ]
            }
        ]
    }
}