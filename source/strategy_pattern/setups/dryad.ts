import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import {
    JACKO,
    MAGE_SPLASH_WEAPONS,
    RANGER_SPLASH_WEAPONS,
    SUPERMITTENS,
    WARRIOR_SPLASH_WEAPONS,
    ZAPPER_CRING,
} from "./equipment.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructDryadSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("dryad")

    const priestStrategy: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            enableAbsorbToTank: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["resistance", "int", "attack"],
                prefer: { ...ZAPPER_CRING },
            },
            type: "dryad",
        }),
        move: moveStrategy,
    }

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
                    priestStrategy,
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
            {
                id: "dryad_priest,ranger",
                characters: [
                    priestStrategy,
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "blast", "explosion"],
                                prefer: {
                                    ...RANGER_SPLASH_WEAPONS,
                                },
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
