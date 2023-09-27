import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base.js"

export function constructGooSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("goo")

    return {
        configs: [
            {
                id: "goo_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["frequency", "blast", "explosion"]
                            },
                            type: "goo"
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "goo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableCurse: true,
                            generateEnsureEquipped: {
                                attributes: ["frequency"]
                            },
                            type: "goo"
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "goo_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["frequency"]
                            },
                            type: "goo"
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "goo_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["frequency", "blast", "explosion"]
                            },
                            type: "goo"
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}