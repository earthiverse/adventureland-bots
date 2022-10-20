import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_LUCK } from "./equipment.js"

export function constructRGooSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const goos: MonsterName[] = ["rgoo", "bgoo"]
    const moveStrategy = new ImprovedMoveStrategy(goos, { idlePosition: { map: "goobrawl", x: 0, y: 0 } })

    return {
        configs: [
            {
                id: "rgoo_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            typeList: goos
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            enableHealStrangers: true,
                            ensureEquipped: { ...PRIEST_LUCK },
                            typeList: goos
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "bataxe" },
                            },
                            typeList: goos
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}