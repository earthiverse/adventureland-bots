import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_LUCK } from "./equipment.js"

export function constructPlantoidSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("plantoid")[0]

    return {
        configs: [
            {
                id: "plantoid_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
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
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_LUCK,
                            type: "plantoid",
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "vhammer" },
                                offhand: { name: "glolipop" }
                            },
                            targetingPartyMember: true,
                            type: "plantoid"
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: -5 } })
                    }
                ]
            },
        ]
    }
}