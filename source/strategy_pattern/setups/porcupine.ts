import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_NORMAL, PRIEST_NORMAL } from "./equipment.js"

export function constructPorcupineSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "porcupine_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...MAGE_NORMAL },
                            type: "porcupine",
                        }),
                        move: new ImprovedMoveStrategy("porcupine")
                    }
                ]
            },
            {
                id: "porcupine_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...PRIEST_NORMAL },
                            type: "porcupine"
                        }),
                        move: new ImprovedMoveStrategy("porcupine")
                    }
                ]
            },
            {
                id: "porcupine_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            // TODO: Ranger normal
                            type: "porcupine"
                        }),
                        move: new ImprovedMoveStrategy("porcupine")
                    }
                ]
            },
        ]
    }
}

export function constructPorcupineHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
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
                        move: new ImprovedMoveStrategy("porcupine")
                    }
                ]
            },
            {
                id: "porcupine_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, type: "porcupine" }),
                        move: new ImprovedMoveStrategy("porcupine")
                    }
                ]
            },
            {
                id: "porcupine_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, type: "porcupine" }),
                        move: new ImprovedMoveStrategy("porcupine")
                    }
                ]
            },
        ]
    }
}