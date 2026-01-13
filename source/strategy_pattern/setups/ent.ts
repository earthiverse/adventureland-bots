import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, KiteMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructEntSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("ent")[0]

    return {
        configs: [
            {
                id: "ent_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "blast", "explosion"],
                            },
                            maximumTargets: 0,
                            targetingPartyMember: true,
                            type: "ent",
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: 5 } }),
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            maximumTargets: 0,
                            targetingPartyMember: true,
                            type: "ent",
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: -5 } }),
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "blast", "explosion"],
                            },
                            type: "ent",
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 }),
                    },
                ],
            },
        ],
    }
}

export function constructEntHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new KiteMoveStrategy({ typeList: ["ent"] })

    return {
        configs: [
            {
                id: "ent_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            type: "ent",
                            hasTarget: true,
                            maximumTargets: 0,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "ent_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            type: "ent",
                            hasTarget: true,
                            maximumTargets: 0,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "ent_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableAbsorb: true,
                            type: "ent",
                            hasTarget: true,
                            maximumTargets: 0,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "ent_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            type: "ent",
                            hasTarget: true,
                            maximumTargets: 0,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "ent_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            type: "ent",
                            hasTarget: true,
                            maximumTargets: 0,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "ent_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            disableCleave: true,
                            type: "ent",
                            hasTarget: true,
                            maximumTargets: 0,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
