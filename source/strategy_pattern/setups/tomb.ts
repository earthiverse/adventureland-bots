import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { RETURN_HIGHEST } from "./equipment.js"

export const TOMB_MONSTERS: MonsterName[] = ["ggreenpro", "gredpro", "gbluepro", "gpurplepro"]

export function constructTombSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({ contexts, typeList: TOMB_MONSTERS })

    return {
        configs: [
            {
                id: "bots_rogue,priest",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["armor", "resistance"],
                                prefer: {
                                    mainhand: { name: "cclaw", filters: RETURN_HIGHEST },
                                    offhand: { name: "cclaw", filters: RETURN_HIGHEST },
                                },
                            },
                            hasTarget: true,
                            typeList: TOMB_MONSTERS,
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            enableAbsorbToTank: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "resistance"],
                            },
                            typeList: TOMB_MONSTERS,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
