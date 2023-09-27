import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructPPPomPomSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "pppompom_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            maximumTargets: 1,
                            targetingPartyMember: true,
                            type: "pppompom"
                        }),
                        move: new HoldPositionMoveStrategy({ map: "level2n", x: 120, y: -170 })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableAbsorbToTank: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            maximumTargets: 1,
                            type: "pppompom",
                        }),
                        move: new HoldPositionMoveStrategy({ map: "level2n", x: 120, y: -130 })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "attack"],
                            },
                            maximumTargets: 1,
                            targetingPartyMember: true,
                            type: "pppompom"
                        }),
                        move: new HoldPositionMoveStrategy({ map: "level2n", x: 120, y: -150 })
                    }
                ]
            },
        ]
    }
}