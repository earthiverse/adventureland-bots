import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { JACKO, MAGE_SPLASH_WEAPONS, SUPERMITTENS, WARRIOR_SPLASH_WEAPONS, ZAPPER_CRING } from "./equipment.js"

export function constructDryadSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("dryad")

    return {
        configs: [
            {
                id: "dryad_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "attack"],
                                prefer: { ...MAGE_SPLASH_WEAPONS, ...ZAPPER_CRING, ...JACKO, ...SUPERMITTENS },
                            },
                            type: "dryad",
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "attack"],
                                prefer: { ...ZAPPER_CRING },
                            },
                            type: "dryad",
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "str", "attack"],
                                prefer: { ...WARRIOR_SPLASH_WEAPONS, ...SUPERMITTENS },
                            },
                            type: "dryad",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
