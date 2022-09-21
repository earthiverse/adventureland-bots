import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../../strategy_pattern/context.js"
import { MageAttackStrategy } from "../../strategy_pattern/strategies/attack_mage.js"
import { PriestAttackStrategy } from "../../strategy_pattern/strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../../strategy_pattern/strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "../../strategy_pattern/strategies/move.js"
import { MHSetup } from "./base"

export function constructPlantoidSetup(contexts: Strategist<PingCompensatedCharacter>[]): MHSetup {
    const spawn = AL.Pathfinder.locateMonster("plantoid")[0]

    return {
        setups: [
            {
                id: "plantoid_mage,priest,warrior",
                characters: [
                    {
                        character: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, disableEnergize: true, disableZapper: true, type: "plantoid" }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: 5 } })
                    },
                    {
                        character: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableEnergize: true, enableGreedyAggro: true, ensureEquipped: { ring1: { name: "zapper" }, ring2: { name: "cring" } }, type: "plantoid" }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 })
                    },
                    {
                        character: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableZapper: true, enableEquipForCleave: true, ensureEquipped: { mainhand: { name: "vhammer" }, offhand: { name: "glolipop" } }, type: "plantoid" }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: -5 } })
                    }
                ]
            },
        ]
    }
}