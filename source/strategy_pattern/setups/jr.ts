import { Mage, PingCompensatedCharacter } from "alclient"
import { filterContexts, Strategist } from "../context.js"
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
            // Don't leave the party if we're doing a monsterhunt for another character
            if (
                !filterContexts(this.options.contexts, { serverData: bot.serverData }).some(
                    (c) =>
                        c.bot !== bot && // It's OK if it's our monsterhunt
                        c.bot.party === bot.party && // Same party
                        this.options?.typeList.includes(c.bot.s.monsterhunt?.id), // They have it as a monsterhunt
                )
            ) {
                bot.leaveParty().catch(suppress_errors)
            }
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
                            type: "jr",
                        }),
                        move: new ImprovedMoveStrategy("jr"),
                        require: {
                            items: ["jacko"],
                        },
                    },
                ],
            },
        ],
    }
}
