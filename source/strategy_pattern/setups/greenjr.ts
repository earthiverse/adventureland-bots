import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructGreenJrSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("greenjr")
    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: { attributes: ["luck"] },
            typeList: ["greenjr", "osnake", "snake"],
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
            typeList: ["greenjr", "osnake", "snake"],
        }),
        move: moveStrategy,
        require: {
            items: ["jacko"],
        },
    }

    return {
        configs: [
            {
                id: "greenjr_mage",
                characters: [mageConfig],
            },
            {
                id: "greenjr_ranger",
                characters: [rangerConfig],
            },
        ],
    }
}
