import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, KiteInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_LUCK } from "./equipment.js"

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
                            ensureEquipped: {
                                mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
                                offhand: { name: "wbook1", filters: { returnHighestLevel: true } }
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
                            ensureEquipped: { ...PRIEST_LUCK },
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
                            ensureEquipped: {
                                mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                offhand: { name: "fireblade", filters: { returnHighestLevel: true } }
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