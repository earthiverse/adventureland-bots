import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { RETURN_HIGHEST } from "./equipment.js"

const attackTypes: MonsterName[] = ["crab", "phoenix", "squigtoad", "squig"]
const moveTypes: MonsterName[] = ["crab"]

export function constructCrabSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy(moveTypes)

    return {
        configs: [
            {
                id: "crab_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["int", "blast", "explosion"],
                            },
                            typeList: attackTypes,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "crab_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableCurse: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "frequency"],
                            },
                            typeList: attackTypes,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "crab_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["dex", "frequency"],
                            },
                            typeList: attackTypes,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "crab_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                prefer: {
                                    mainhand: { name: "cclaw", filters: RETURN_HIGHEST },
                                    offhand: { name: "cclaw", filters: RETURN_HIGHEST },
                                },
                            },
                            typeList: attackTypes,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "crab_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["str", "blast", "explosion"],
                            },
                            typeList: attackTypes,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
