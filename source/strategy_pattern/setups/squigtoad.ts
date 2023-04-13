import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_FAST, WARRIOR_SPLASH } from "./equipment.js"

const types: MonsterName[] = ["squigtoad", "squig", "phoenix"]

export function constructSquigToadSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy(types)

    return {
        configs: [
            {
                id: "squigtoad_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...MAGE_FAST },
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "squigtoad_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, typeList: types }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "squigtoad_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: types }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "squigtoad_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}

export function constructSquigToadHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy(types)

    return {
        configs: [
            {
                id: "squigtoad_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: types }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "squigtoad_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, typeList: types }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "squigtoad_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: types }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "squigtoad_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, typeList: types }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}