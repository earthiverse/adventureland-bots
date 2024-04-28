import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructGoldenbatSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "goldenbat_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["int", "attack"] },
                            type: "goldenbat",
                        }),
                        move: new SpecialMonsterMoveStrategy({
                            contexts: contexts,
                            typeList: ["goldenbat"],
                        }),
                    },
                ],
            },
            {
                id: "goldenbat_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["dex", "attack"] },
                            type: "goldenbat",
                        }),
                        move: new SpecialMonsterMoveStrategy({
                            contexts: contexts,
                            typeList: ["goldenbat"],
                        }),
                    },
                ],
            },
        ],
    }
}
