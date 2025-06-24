import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructFVampireSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["fvampire"] })

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: { attributes: ["resistance", "int", "attack"] },
            type: "fvampire",
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "fvampire_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "attack"],
                                avoidAttributes: ["blast", "explosion"],
                            },
                            type: "fvampire",
                        }),
                        move: moveStrategy,
                    },
                    priestConfig,
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "str", "attack"],
                                avoidAttributes: ["blast", "explosion"],
                            },
                            type: "fvampire",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "fvampire_priest,ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "str", "attack"],
                                avoidAttributes: ["blast", "explosion"],
                            },
                            type: "fvampire",
                        }),
                        move: moveStrategy,
                    },
                    priestConfig,
                ],
            },
        ],
    }
}
