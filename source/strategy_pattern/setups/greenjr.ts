import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_NORMAL } from "./equipment.js"
import { MageNoPartyAttackStrategy } from "./jr.js"

export function constructGreenJrSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "greenjr_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageNoPartyAttackStrategy({ contexts: contexts, ensureEquipped: { ...MAGE_NORMAL }, typeList: ["greenjr", "osnake", "snake"] }),
                        move: new ImprovedMoveStrategy("greenjr")
                    }
                ]
            }
        ]
    }
}