import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR, WARRIOR_SPLASH } from "./equipment.js"

export function constructXScorpionSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("xscorpion")[0]

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
                            ensureEquipped: { ...MAGE_SPLASH },
                            targetingPartyMember: true,
                            type: "xscorpion"
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: 5 } })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            type: "xscorpion",
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: -5 } })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            targetingPartyMember: true,
                            type: "xscorpion"
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 })
                    }
                ]
            },
        ]
    }
}