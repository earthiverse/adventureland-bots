import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructBoarSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "boar_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "blast", "explosion"]
                            },
                            type: "boar"
                        }),
                        move: new ImprovedMoveStrategy("boar")
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "attack"]
                            },
                            type: "boar",
                        }),
                        move: new ImprovedMoveStrategy("boar")
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["str", "blast", "explosion"]
                            },
                            enableGreedyAggro: true,
                            type: "boar"
                        }),
                        move: new ImprovedMoveStrategy("boar")
                    }
                ]
            },
            {
                id: "boar_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "attack"]
                            },
                            type: "boar",
                        }),
                        move: new ImprovedMoveStrategy("boar")
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["str", "blast", "explosion"]
                            },
                            enableGreedyAggro: true,
                            type: "boar"
                        }),
                        move: new ImprovedMoveStrategy("boar")
                    }
                ]
            },
        ]
    }
}