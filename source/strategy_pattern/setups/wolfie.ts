import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_LUCK, WARRIOR_SPLASH } from "./equipment.js"

export function constructWolfieSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "wolfie_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                prefer: { ...MAGE_SPLASH }
                            },
                            type: "wolfie"
                        }),
                        move: new ImprovedMoveStrategy("wolfie")
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                prefer: { ...PRIEST_LUCK }
                            },
                            type: "wolfie",
                        }),
                        move: new ImprovedMoveStrategy("wolfie")
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                prefer: { ...WARRIOR_SPLASH }
                            },
                            enableGreedyAggro: true,
                            type: "wolfie"
                        }),
                        move: new ImprovedMoveStrategy("wolfie")
                    }
                ]
            },
        ]
    }
}