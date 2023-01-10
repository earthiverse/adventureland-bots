import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
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