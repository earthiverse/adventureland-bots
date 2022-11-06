import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_ARMOR, PRIEST_ARMOR, WARRIOR_NORMAL } from "./equipment.js"

export function constructFireRoamerSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "fireroamer_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...MAGE_ARMOR },
                            maximumTargets: 1,
                            targetingPartyMember: true,
                            type: "fireroamer"
                        }),
                        move: new HoldPositionMoveStrategy({ map: "desertland", x: 160, y: -675 })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            maximumTargets: 1,
                            type: "fireroamer",
                        }),
                        move: new HoldPositionMoveStrategy({ map: "desertland", x: 180, y: -675 })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...WARRIOR_NORMAL },
                            maximumTargets: 1,
                            targetingPartyMember: true,
                            type: "fireroamer"
                        }),
                        move: new HoldPositionMoveStrategy({ map: "desertland", x: 200, y: -675 })
                    }
                ]
            },
        ]
    }
}