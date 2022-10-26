import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_NORMAL, PRIEST_LUCK } from "./equipment.js"

export function constructFrogSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "frog_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, ensureEquipped: { ...MAGE_NORMAL }, typeList: ["frog", "tortoise"] }),
                        move: new ImprovedMoveStrategy(["frog", "tortoise"])
                    }
                ]
            },
            {
                id: "frog_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, ensureEquipped: { ...PRIEST_LUCK }, typeList: ["frog", "tortoise"] }),
                        move: new ImprovedMoveStrategy(["frog", "tortoise"])
                    }
                ]
            }
        ]
    }
}