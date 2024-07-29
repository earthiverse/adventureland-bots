import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_ARMOR, WARRIOR_SPLASH } from "./equipment.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"

export function constructPRatSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("prat")[0]

    return {
        configs: [
            {
                id: "prat_priest,warrior,mage",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                prefer: { ...PRIEST_ARMOR },
                            },
                            type: "prat",
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: 10 } }),
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                prefer: { ...WARRIOR_SPLASH },
                            },
                            enableGreedyAggro: true,
                            type: "prat",
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 40, sides: 8 }),
                    },
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            enableGreedyAggro: true,
                            type: "prat",
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: -10 } }),
                    },
                ],
            },
            {
                id: "prat_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                prefer: { ...PRIEST_ARMOR },
                            },
                            type: "prat",
                        }),
                        move: new HoldPositionMoveStrategy(spawn),
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                prefer: { ...WARRIOR_SPLASH },
                            },
                            enableGreedyAggro: true,
                            type: "prat",
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 }),
                    },
                ],
            },
        ],
    }
}
