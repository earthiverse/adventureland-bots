import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { BasicMoveStrategy, HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR } from "./equipment.js"

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
                            ensureEquipped: { ... MAGE_SPLASH },
                            maximumTargets: 0,
                            targetingPartyMember: true,
                            type: "ent",
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: 5 } })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            maximumTargets: 0,
                            targetingPartyMember: true,
                            type: "ent",
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: -5 } })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableGreedyAggro: true,
                            ensureEquipped: {
                                amulet: { name: "snring", filters: { returnHighestLevel: true } },
                                belt: { name: "strbelt", filters: { returnHighestLevel: true } },
                                cape: { name: "bcape", filters: { returnHighestLevel: true } },
                                chest: { name: "xarmor", filters: { returnHighestLevel: true } },
                                gloves: { name: "xgloves", filters: { returnHighestLevel: true } },
                                helmet: { name: "xhelmet", filters: { returnHighestLevel: true } },
                                mainhand: { name: "vhammer", filters: { returnHighestLevel: true } },
                                offhand: { name: "ololipop", filters: { returnHighestLevel: true } },
                                orb: { name: "vorb", filters: { returnHighestLevel: true } },
                                pants: { name: "xpants", filters: { returnHighestLevel: true } },
                                ring1: { name: "zapper", filters: { returnHighestLevel: true } },
                                ring2: { name: "strring", filters: { returnHighestLevel: true } },
                                shoes: { name: "vboots", filters: { returnHighestLevel: true } },
                            },
                            type: "ent",
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 })
                    }
                ]
            },
        ]
    }
}

export function constructEntHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new BasicMoveStrategy("ent")

    return {
        configs: [
            {
                id: "ent_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, type: "ent", hasTarget: true, maximumTargets: 0 }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "ent_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, type: "ent", hasTarget: true, maximumTargets: 0 }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "ent_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, type: "ent", hasTarget: true, maximumTargets: 0 }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "ent_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, type: "ent", hasTarget: true, maximumTargets: 0 }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "ent_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, type: "ent", hasTarget: true, maximumTargets: 0 }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "ent_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, disableCleave: true, type: "ent", hasTarget: true, maximumTargets: 0 }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}