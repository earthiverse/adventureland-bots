import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructRHarpySetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["rharpy"] })

    return {
        configs: [
            {
                id: "rharpy_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "attack"],
                            },
                            type: "rharpy",
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
                                attributes: ["resistance", "int", "attack"],
                            },
                            type: "rharpy",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "str", "attack"],
                            },
                            type: "rharpy",
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}