import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { HoldPositionMoveStrategy, ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { RETURN_HIGHEST } from "./equipment.js"
import { pinkGoblinIdlePosition } from "../../base/locations.js"

export function constructPinkGoblinSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("pinkgoblin")
    const holdPositon = new HoldPositionMoveStrategy(pinkGoblinIdlePosition, { offset: { x: 5, y: 5 } })

    const rogueConfig: CharacterConfig = {
        ctype: "rogue",
        attack: new RogueAttackStrategy({
            contexts,
            hasTarget: true,
            generateEnsureEquipped: {
                prefer: {
                    mainhand: { name: "cclaw", filters: RETURN_HIGHEST },
                    offhand: { name: "cclaw", filters: RETURN_HIGHEST },
                    orb: { name: "test_orb", filters: RETURN_HIGHEST },
                },
            },
            type: "pinkgoblin",
        }),
        move: holdPositon,
    }

    return {
        configs: [
            {
                id: "pinkgoblin_priest,rogue,rogue",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                prefer: {
                                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                                    orb: { name: "test_orb", filters: RETURN_HIGHEST },
                                },
                                attributes: ["resistance", "stun"],
                            },
                            maximumTargets: 1,
                            type: "pinkgoblin",
                        }),
                        move: moveStrategy,
                    },
                    rogueConfig,
                    rogueConfig,
                ],
            },
        ],
    }
}
