import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"

export function constructMinimushSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("minimush")
    const types: MonsterName[] = ["minimush", "phoenix", "tinyp"]

    return {
        configs: [
            {
                id: "minimush_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["frequency", "blast", "explosion"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "minimush_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableCurse: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["frequency"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "minimush_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["frequency", "blast", "explosion"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "minimush_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["frequency", "range"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "minimush_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["frequency", "blast", "explosion"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
