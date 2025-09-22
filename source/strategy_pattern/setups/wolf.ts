import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR, RETURN_HIGHEST, WARRIOR_SPLASH } from "./equipment.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructWolfSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("wolf")

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                prefer: { ...PRIEST_ARMOR },
            },
            type: "wolf",
        }),
        move: moveStrategy,
    }

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
                                prefer: { ...MAGE_SPLASH },
                            },
                            targetingPartyMember: true,
                            type: "wolf",
                        }),
                        move: moveStrategy,
                    },
                    priestConfig,
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                prefer: { ...WARRIOR_SPLASH },
                            },
                            targetingPartyMember: true,
                            typeList: ["wolf", "stompy"],
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "wolf_priest,ranger",
                characters: [
                    priestConfig,
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                avoidAttributes: ["blast", "explosion"],
                                prefer: {
                                    mainhand: { name: "crossbow", filters: RETURN_HIGHEST },
                                },
                            },
                            type: "wolf",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
