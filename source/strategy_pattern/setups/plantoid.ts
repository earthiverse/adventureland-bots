import AL, { IPosition, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, KiteMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Requirements, Setup } from "./base"
import { MAGE_SPLASH_WEAPONS, ZAPPER_STRRING, WARRIOR_SPLASH_WEAPONS, ZAPPER_CRING } from "./equipment.js"

export function constructPlantoidSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const requirements: Requirements = {
        items: ["jacko"],
        range: AL.Game.G.monsters.plantoid.range + 50,
        speed: AL.Game.G.monsters.plantoid.charge,
    }
    const kiteMoveStrategy = new KiteMoveStrategy({
        contexts: contexts,
        disableCheckDB: true,
        typeList: ["plantoid"],
    })
    const spawns = AL.Pathfinder.locateMonster("plantoid").filter((spawn) => spawn.map === "desertland")
    const spawn: IPosition = {
        map: "desertland",
        x: spawns.reduce((sum, s) => sum + s.x, 0) / spawns.length,
        y: spawns.reduce((sum, s) => sum + s.y, 0) / spawns.length,
    }

    return {
        configs: [
            {
                id: "greedy_plantoid_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "explosion", "blast"],
                                prefer: MAGE_SPLASH_WEAPONS,
                            },
                            targetingPartyMember: true,
                            typeList: ["porcupine", "plantoid", "mechagnome", "ent"], // Target porcupines first, to kill them so the warrior doesn't take damage
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: 5 } }),
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableAbsorbToTank: true,
                            enableGreedyAggro: ["plantoid", "mechagnome", "ent"],
                            generateEnsureEquipped: {
                                attributes: ["armor", "attack"],
                                prefer: {
                                    ...ZAPPER_CRING
                                }
                            },
                            typeList: ["porcupine", "plantoid", "mechagnome", "ent"], // Target porcupines first, to kill them so the warrior doesn't take damage
                        }),
                        move: new HoldPositionMoveStrategy(spawn, { offset: { x: -5 } }),
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            // Porcupines are too close
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "explosion", "blast"],
                                prefer: {
                                    ...WARRIOR_SPLASH_WEAPONS,
                                },
                            },
                            targetingPartyMember: true,
                            typeList: ["plantoid", "mechagnome", "ent"],
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 }),
                    },
                ],
            },
            {
                id: "plantoid_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            maximumTargets: 1,
                            type: "plantoid",
                        }),
                        move: kiteMoveStrategy,
                        require: requirements,
                    },
                ],
            },
            {
                id: "plantoid_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            type: "plantoid",
                        }),
                        move: kiteMoveStrategy,
                        require: requirements,
                    },
                ],
            },
        ],
    }
}
