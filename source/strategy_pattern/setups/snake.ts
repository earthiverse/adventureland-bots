import { MonsterName, PingCompensatedCharacter } from "alclient"
import { halloweenSafeSnakes } from "../../base/locations.js"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_FAST, WARRIOR_SPLASH } from "./equipment.js"

export function constructSnakeSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const monsters: MonsterName[] = ["snake", "osnake", "tinyp"]
    const moveStrategy = new ImprovedMoveStrategy(monsters, { idlePosition: halloweenSafeSnakes })

    return {
        configs: [
            {
                id: "snake_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: monsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "snake_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...PRIEST_FAST },
                            typeList: monsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "snake_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "snake_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: monsters
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}