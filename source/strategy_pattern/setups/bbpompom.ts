import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_LUCK } from "./equipment.js"

export function constructBBPomPomSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "bbpompom_mage,priest",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: {
                                mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
                                offhand: { name: "wbook1", filters: { returnHighestLevel: true } }
                            },
                            type: "bbpompom"
                        }),
                        move: new ImprovedMoveStrategy("bbpompom")
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_LUCK },
                            type: "bbpompom",
                        }),
                        move: new ImprovedMoveStrategy("bbpompom")
                    }
                ]
            },
        ]
    }
}