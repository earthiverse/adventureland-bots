import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_LUCK, WARRIOR_SPLASH } from "./equipment.js"

export function constructStoneWormSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("stoneworm")[0]

    return {
        configs: [
            {
                id: "stoneworm_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...MAGE_SPLASH },
                            type: "stoneworm"
                        }),
                        move: new ImprovedMoveStrategy("stoneworm")
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...PRIEST_LUCK },
                            type: "stoneworm",
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 100, sides: 16 })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            type: "stoneworm"
                        }),
                        move: new ImprovedMoveStrategy("stoneworm")
                    }
                ]
            },
        ]
    }
}