import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructBigBirdSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("bigbird")[0]
    const mageMoveStrategy = new HoldPositionMoveStrategy(spawn, { offset: { x: 5 } })
    const priestMoveStrategy = new HoldPositionMoveStrategy(spawn, { offset: { x: -5 } })
    const warriorMoveStrategy = new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 })

    return {
        configs: [
            {
                id: "greedy_bigbird_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["blast", "explosion", "int", "armor"]
                            },
                            type: "bigbird"
                        }),
                        move: mageMoveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "attack", "armor"]
                            },
                            type: "bigbird",
                        }),
                        move: priestMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["blast", "explosion", "str", "armor"]
                            },
                            enableGreedyAggro: true,
                            type: "bigbird"
                        }),
                        move: warriorMoveStrategy
                    }
                ]
            },
            {
                id: "greedy_bigbird_mage,priest",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["blast", "explosion", "int", "armor"]
                            },
                            type: "bigbird"
                        }),
                        move: mageMoveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "int", "armor"]
                            },
                            type: "bigbird",
                        }),
                        move: priestMoveStrategy
                    },
                ]
            },
            {
                id: "greedy_bigbird_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "int", "armor"]
                            },
                            type: "bigbird",
                        }),
                        move: priestMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["blast", "explosion", "str", "armor"]
                            },
                            enableGreedyAggro: true,
                            type: "bigbird"
                        }),
                        move: warriorMoveStrategy
                    }
                ]
            },
        ]
    }
}