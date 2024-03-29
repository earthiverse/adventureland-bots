import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructHarpySetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, disableCheckDB: true, typeList: ["harpy"] })

    return {
        configs: [
            {
                id: "harpy_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"]
                            },
                            maximumTargets: 1,
                            type: "harpy",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"]
                            },
                            maximumTargets: 1,
                            type: "harpy",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "attack"]
                            },
                            maximumTargets: 1,
                            type: "harpy",
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "harpy_mage,priest",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"]
                            },
                            maximumTargets: 1,
                            type: "harpy",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"]
                            },
                            maximumTargets: 1,
                            type: "harpy",
                        }),
                        move: moveStrategy
                    },
                ]
            },
            {
                id: "harpy_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"]
                            },
                            maximumTargets: 1,
                            type: "harpy",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "attack"]
                            },
                            maximumTargets: 1,
                            type: "harpy",
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}