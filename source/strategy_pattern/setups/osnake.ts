import { PingCompensatedCharacter } from "alclient"
import { halloweenSafeSnakes } from "../../base/locations.js"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, WARRIOR_SPLASH } from "./equipment.js"

export function constructOSnakeSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "osnake_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: ["osnake", "snake"]
                        }),
                        move: new ImprovedMoveStrategy(["osnake", "snake"], { idlePosition: halloweenSafeSnakes })
                    }
                ]
            },
            {
                id: "osnake_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, typeList: ["osnake", "snake"] }),
                        move: new ImprovedMoveStrategy(["osnake", "snake"], { idlePosition: halloweenSafeSnakes })
                    }
                ]
            },
            {
                id: "osnake_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: ["osnake", "snake"] }),
                        move: new ImprovedMoveStrategy(["osnake", "snake"], { idlePosition: halloweenSafeSnakes })
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
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: ["osnake", "snake"]
                        }),
                        move: new ImprovedMoveStrategy(["osnake", "snake"], { idlePosition: halloweenSafeSnakes })
                    }
                ]
            }
        ]
    }
}