import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR, WARRIOR_SPLASH } from "./equipment.js"

export function constructWolfSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "wolf_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                prefer: { ...MAGE_SPLASH }
                            },
                            targetingPartyMember: true,
                            type: "wolf"
                        }),
                        move: new ImprovedMoveStrategy("wolf")
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                prefer: { ...PRIEST_ARMOR }
                            },
                            type: "wolf",
                        }),
                        move: new ImprovedMoveStrategy("wolf")
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                prefer: { ...WARRIOR_SPLASH }
                            },
                            targetingPartyMember: true,
                            typeList: ["wolf", "stompy"]
                        }),
                        move: new ImprovedMoveStrategy("wolf")
                    }
                ]
            },
        ]
    }
}