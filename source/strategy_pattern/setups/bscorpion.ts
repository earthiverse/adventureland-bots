import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, KiteInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RETURN_HIGHEST } from "./equipment.js"

export function constructBScorpionSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("bscorpion")[0]
    const kiteStrategy = new KiteInCircleMoveStrategy({ center: spawn, type: "bscorpion", radius: 110 })
    const moveStrategy = new ImprovedMoveStrategy("bscorpion")

    return {
        configs: [
            {
                id: "bscorpion_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["int", "attack"],
                                prefer: {
                                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                                },
                            },
                            targetingPartyMember: true,
                            type: "bscorpion",
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableAbsorbToTank: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "int"],
                                prefer: {
                                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                                },
                            },
                            type: "bscorpion",
                        }),
                        move: kiteStrategy,
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "str"],
                                prefer: {
                                    mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
                                    offhand: { name: "fireblade", filters: RETURN_HIGHEST },
                                },
                            },
                            targetingPartyMember: true,
                            type: "bscorpion",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}

export function constructBScorpionHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("bscorpion")[0]
    const kiteStrategy = new KiteInCircleMoveStrategy({ center: spawn, type: "bscorpion", radius: 110 })

    const priestStrategy = new PriestAttackStrategy({
        contexts: contexts,
        disableEnergize: true,
        enableAbsorbToTank: true,
        enableGreedyAggro: true,
        generateEnsureEquipped: {
            attributes: ["range", "int"],
            prefer: {
                mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            },
        },
        type: "bscorpion",
    })
    const rangerStrategy = new RangerAttackStrategy({
        contexts: contexts,
        disableZapper: true,
        generateEnsureEquipped: {
            attributes: ["range", "dex"],
        },
        targetingPartyMember: true,
        type: "bscorpion",
    })
    const rogueStrategy = new RogueAttackStrategy({
        contexts: contexts,
        disableZapper: true,
        generateEnsureEquipped: {
            attributes: ["range", "dex"],
        },
        targetingPartyMember: true,
        type: "bscorpion",
    })

    return {
        configs: [
            {
                id: "bscorpion_helper_priest,rogue,rogue",
                characters: [
                    {
                        ctype: "priest",
                        attack: priestStrategy,
                        move: kiteStrategy,
                    },
                    {
                        ctype: "rogue",
                        attack: rogueStrategy,
                        move: kiteStrategy,
                    },
                    {
                        ctype: "rogue",
                        attack: rogueStrategy,
                        move: kiteStrategy,
                    },
                ],
            },
            {
                id: "bscorpion_helper_priest,rogue",
                characters: [
                    {
                        ctype: "priest",
                        attack: priestStrategy,
                        move: kiteStrategy,
                    },
                    {
                        ctype: "rogue",
                        attack: rogueStrategy,
                        move: kiteStrategy,
                    },
                ],
            },
            {
                id: "bscorpion_helper_priest,ranger",
                characters: [
                    {
                        ctype: "priest",
                        attack: priestStrategy,
                        move: kiteStrategy,
                    },
                    {
                        ctype: "ranger",
                        attack: rangerStrategy,
                        move: kiteStrategy,
                    },
                ],
            },
        ],
    }
}
