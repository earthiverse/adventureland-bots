import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { WARRIOR_SPLASH, ZAPPER_CRING } from "./equipment.js"
import { mforestOdinos } from "../../base/locations.js"

export function constructOrangeDinoSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("odino", { idlePosition: mforestOdinos })
    const moveInCircleStrategy = new MoveInCircleMoveStrategy({ center: mforestOdinos, radius: 20, sides: 8 })

    return {
        configs: [
            {
                id: "odino_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                                prefer: ZAPPER_CRING,
                            },
                            type: "odino",
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                                prefer: ZAPPER_CRING,
                            },
                            type: "odino",
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "attack"],
                                prefer: { ...WARRIOR_SPLASH },
                            },
                            type: "odino",
                        }),
                        move: moveInCircleStrategy,
                    },
                ],
            },
        ],
    }
}
