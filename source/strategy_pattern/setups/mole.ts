import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructMoleSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("mole", {
        idlePosition: {
            map: "tunnel",
            x: 0,
            y: -735
        }
    })

    return {
        configs: [
            {
                id: "mole_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"]
                            },
                            type: "mole",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "blast", "explosion"]
                            },
                            enableGreedyAggro: true,
                            type: "mole"
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}