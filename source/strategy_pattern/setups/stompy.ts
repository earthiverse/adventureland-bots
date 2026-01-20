import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackWithAttributesStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, MP_RECOVERY, PRIEST_ARMOR, RETURN_HIGHEST, WARRIOR_SPLASH } from "./equipment.js"

export function constructStompySetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const typeList: MonsterName[] = ["stompy", "wolf", "mechagnome"]
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
                                prefer: {
                                    ...MAGE_SPLASH,
                                    ...MP_RECOVERY,
                                    orb: { name: "orboftemporal", filters: RETURN_HIGHEST },
                                },
                            },
                            typeList,
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
                            typeList,
                        }),
                        move: new ImprovedMoveStrategy("stompy"),
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackWithAttributesStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                prefer: {
                                    ...WARRIOR_SPLASH,
                                    ...MP_RECOVERY,
                                    orb: { name: "orboftemporal", filters: RETURN_HIGHEST },
                                },
                            },
                            typeList,
                            switchConfig: [["stompy", 100_000, ["luck"]]],
                        }),
                        move: new ImprovedMoveStrategy(["stompy", "wolf"]),
                    },
                ],
            },
        ],
    }
}
