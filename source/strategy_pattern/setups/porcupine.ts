import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"

export function constructPorcupineSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("porcupine")
    return {
        configs: [
            {
                id: "porcupine_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["attack", "int"],
                            },
                            type: "porcupine",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "porcupine_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["attack", "int"],
                            },
                            type: "porcupine",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "porcupine_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["attack", "dex"],
                            },
                            type: "porcupine",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "porcupine_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["range"],
                            },
                            type: "porcupine",
                        }),
                        require: {
                            range: 75, // Require 75 range for dreturn to not take affect
                        },
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}

export function constructPorcupineHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("porcupine")
    return {
        configs: [
            {
                id: "porcupine_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            type: "porcupine",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "porcupine_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            type: "porcupine",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "porcupine_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            type: "porcupine",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
