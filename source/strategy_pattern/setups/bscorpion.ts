import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, KiteInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructBScorpionSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("bscorpion")[0]
    const kiteStrategy = new KiteInCircleMoveStrategy({ center: spawn, type: "bscorpion", radius: 110 })
    const moveStrategy = new ImprovedMoveStrategy("bscorpion")

    return {
        configs: [
            {
                id: "bscorpion_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "attack"]
                            },
                            targetingPartyMember: true,
                            type: "bscorpion"
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "int"]
                            },
                            type: "bscorpion",
                        }),
                        move: kiteStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "str"]
                            },
                            targetingPartyMember: true,
                            type: "bscorpion"
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}