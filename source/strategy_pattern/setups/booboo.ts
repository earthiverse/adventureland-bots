import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { HoldPositionMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructBooBooSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "booboo_mage,priest",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "int"]
                            },
                            type: "booboo"
                        }),
                        move: new HoldPositionMoveStrategy({ map: "spookytown", x: 265, y: -645 })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "int"]
                            },
                            type: "booboo",
                        }),
                        move: new HoldPositionMoveStrategy({ map: "spookytown", x: 265, y: -605 })
                    }
                ]
            },
            {
                id: "booboo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "int"]
                            },
                            type: "booboo",
                        }),
                        move: new HoldPositionMoveStrategy({ map: "spookytown", x: 265, y: -605 })
                    }
                ]
            },
        ]
    }
}