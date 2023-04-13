import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base.js"
import { MAGE_FAST, PRIEST_FAST, WARRIOR_SPLASH } from "./equipment.js"

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
                            ensureEquipped: { ...MAGE_FAST },
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
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
                            ensureEquipped: { ...PRIEST_FAST },
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "minimush_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: types }),
                        move: moveStrategy
                    }
                ]
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