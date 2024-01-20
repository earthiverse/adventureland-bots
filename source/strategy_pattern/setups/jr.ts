import { Mage, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { suppress_errors } from "../logging.js"

/**
 * If you don't have a party when you kill the greenjr or jr, you get the Halloween bonus!
 * This is probably a bug, but until it's fixed, we'll take advantage of it
 */
export class MageNoPartyAttackStrategy extends MageAttackStrategy {
    protected attack(bot: Mage): Promise<void> {
        if (bot.party) {
            bot.leaveParty().catch(suppress_errors)
        }

        return super.attack(bot)
    }
}

export function constructJrSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "jr_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageNoPartyAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            type: "jr"
                        }),
                        move: new ImprovedMoveStrategy("jr"),
                        require: {
                            items: ["jacko"]
                        }
                    }
                ]
            }
        ]
    }
}