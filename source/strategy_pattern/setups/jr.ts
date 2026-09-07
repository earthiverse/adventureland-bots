import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructJrSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("jr")

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
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
        attack: new RangerAttackStrategy({
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
