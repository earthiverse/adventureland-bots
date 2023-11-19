import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { ZAPPER_CRING, ZAPPER_STRRING } from "./equipment.js"

export function constructOneEyeSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "oneeye_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                                prefer: ZAPPER_CRING
                            },
                            maximumTargets: 1,
                            targetingPartyMember: true,
                            type: "oneeye"
                        }),
                        move: new HoldPositionMoveStrategy({ map: "level2w", x: -175, y: 0 })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                                prefer: ZAPPER_CRING
                            },
                            targetingPartyMember: true,
                            maximumTargets: 1,
                            type: "oneeye",
                        }),
                        move: new HoldPositionMoveStrategy({ map: "level2w", x: -155, y: 0 })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "attack"],
                                prefer: ZAPPER_STRRING
                            },
                            maximumTargets: 1,
                            type: "oneeye"
                        }),
                        move: new HoldPositionMoveStrategy({ map: "level2w", x: -195, y: 0 })
                    }
                ]
            },
        ]
    }
}