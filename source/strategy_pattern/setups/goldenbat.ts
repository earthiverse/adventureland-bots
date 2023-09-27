import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

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
                            type: "goldenbat"
                        }),
                        move: new SpecialMonsterMoveStrategy({
                            contexts: contexts,
                            typeList: ["goldenbat"]
                        })
                    }
                ]
            }
        ]
    }
}