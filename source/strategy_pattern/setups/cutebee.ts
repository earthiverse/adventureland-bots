import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

const attackTypes: MonsterName[] = ["cutebee", "bee", "crab", "crabx", "croc", "frog", "goo", "phoenix", "poisio", "scorpion", "snake", "spider", "squig", "squigtoad", "tortoise"]

export function constructCuteBeeSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["cutebee"] })

    return {
        configs: [
            {
                id: "cutebee_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["str", "frequency"]
                            },
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "cutebee_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "frequency"]
                            },
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}

export function constructCuteBeeHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["cutebee"] })

    return {
        configs: [
            {
                id: "cutebee_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "cutebee_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}