import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR, RETURN_HIGHEST, WARRIOR_SPLASH } from "./equipment.js"

export function constructStompySetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "stompy_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                prefer: { ...MAGE_SPLASH, orb: { name: "orboftemporal", filters: RETURN_HIGHEST } },
                            },
                            targetingPartyMember: true,
                            typeList: ["stompy", "wolf"],
                        }),
                        move: new ImprovedMoveStrategy("stompy"),
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                prefer: { ...PRIEST_ARMOR, orb: { name: "orboftemporal", filters: RETURN_HIGHEST } },
                            },
                            typeList: ["stompy", "wolf"],
                        }),
                        move: new ImprovedMoveStrategy("stompy"),
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                prefer: { ...WARRIOR_SPLASH, orb: { name: "orboftemporal", filters: RETURN_HIGHEST } },
                            },
                            targetingPartyMember: true,
                            typeList: ["stompy", "wolf"],
                        }),
                        move: new ImprovedMoveStrategy(["stompy", "wolf"]),
                    },
                ],
            },
        ],
    }
}
