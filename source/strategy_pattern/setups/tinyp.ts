import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { WARRIOR_STOMP } from "./equipment.js"

export function constructTinyPSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "tinyp_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...WARRIOR_STOMP },
                            isDisabled: true,
                            type: "tinyp",
                        }),
                        move: new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["tinyp"] })
                    }
                ]
            }
        ]
    }
}