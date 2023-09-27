import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructBBPomPomSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("bbpompom")

    return {
        configs: [
            {
                id: "bbpompom_mage,priest",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "blast", "explosion"]
                            },
                            type: "bbpompom"
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "attack"]
                            },
                            type: "bbpompom",
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "bbpompom_warrior,priest",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["str", "blast", "explosion"]
                            },
                            type: "bbpompom"
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "attack"]
                            },
                            type: "bbpompom",
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "bbpompom_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "blast", "explosion"]
                            },
                            type: "bbpompom"
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "attack"]
                            },
                            type: "bbpompom",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "blast", "explosion"]
                            },
                            type: "bbpompom"
                        }),
                        move: moveStrategy
                    },
                ]
            },
        ]
    }
}