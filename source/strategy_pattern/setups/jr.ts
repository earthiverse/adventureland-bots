import { Character, Mage, MonsterName, PingCompensatedCharacter, Ranger } from "alclient"
import { filterContexts, Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { suppress_errors } from "../logging.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

function leavePartyIfNeeded(
    bot: Character,
    contexts: Strategist<PingCompensatedCharacter>[],
    typeList?: MonsterName[],
) {
    if (!bot.party) return

    // Don't leave the party if we're doing a monsterhunt for another character
    if (
        !filterContexts(contexts, { serverData: bot.serverData }).some(
            (c) =>
                c.bot !== bot && // It's OK if it's our monsterhunt
                c.bot.party === bot.party && // Same party
                typeList?.includes(c.bot.s.monsterhunt?.id), // They have it as a monsterhunt
        )
    ) {
        bot.leaveParty().catch(suppress_errors)
    }
}

/**
 * If you don't have a party when you kill the greenjr or jr, you get the Halloween bonus
 * This is probably a bug, but until it's fixed, we'll take advantage of it
 */
export class MageNoPartyAttackStrategy extends MageAttackStrategy {
    protected attack(bot: Mage): Promise<void> {
        leavePartyIfNeeded(bot, this.options.contexts, this.options?.typeList)
        return super.attack(bot)
    }
}

export class RangerNoPartyAttackStrategy extends RangerAttackStrategy {
    protected attack(bot: Ranger): Promise<void> {
        leavePartyIfNeeded(bot, this.options.contexts, this.options?.typeList)
        return super.attack(bot)
    }
}

export function constructJrSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("jr")

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageNoPartyAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: { attributes: ["luck"] },
            type: "jr",
        }),
        move: moveStrategy,
        require: {
            items: ["jacko"],
        },
    }

    const rangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerNoPartyAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: { attributes: ["luck"] },
            type: "jr",
        }),
        move: moveStrategy,
        require: {
            items: ["jacko"],
        },
    }

    return {
        configs: [
            {
                id: "jr_mage",
                characters: [mageConfig],
            },
            {
                id: "jr_ranger",
                characters: [rangerConfig],
            },
        ],
    }
}
