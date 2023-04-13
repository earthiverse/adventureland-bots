import { MonsterName, PingCompensatedCharacter } from "alclient"
import { halloweenSafeSnakes } from "../../base/locations.js"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_FAST, PRIEST_FAST, WARRIOR_SPLASH } from "./equipment.js"

export function constructOSnakeSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const monsters: MonsterName[] = ["greenjr", "osnake", "snake", "tinyp"]
    return {
        configs: [
            {
                id: "osnake_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...MAGE_FAST },
                            typeList: monsters
                        }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: halloweenSafeSnakes })
                    }
                ]
            },
            {
                id: "osnake_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, ensureEquipped: { ...PRIEST_FAST }, typeList: monsters }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: halloweenSafeSnakes })
                    }
                ]
            },
            {
                id: "osnake_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: halloweenSafeSnakes })
                    }
                ]
            },
            {
                id: "osnake_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: monsters
                        }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: halloweenSafeSnakes })
                    }
                ]
            }
        ]
    }
}