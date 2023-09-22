import { PingCompensatedCharacter, Priest } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR, WARRIOR_SPLASH } from "./equipment.js"

class PriestFireRoamerAttackStrategy extends PriestAttackStrategy {
    protected attack(bot: Priest): Promise<void> {
        const entity = bot.getEntity({ type: "fireroamer", returnHighestLevel: true })
        if (entity && entity.level > 10) {
            this.options.maximumTargets = 1
        } else if (entity && entity.level > 5) {
            this.options.maximumTargets = 2
        } else {
            this.options.maximumTargets = undefined
        }

        return super.attack(bot)
    }
}

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
                            ensureEquipped: { ...MAGE_SPLASH },
                            maximumTargets: 1,
                            targetingPartyMember: true,
                            type: "fireroamer"
                        }),
                        move: new HoldPositionMoveStrategy({ map: "desertland", x: 160, y: -675 })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestFireRoamerAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            type: "fireroamer",
                        }),
                        move: new HoldPositionMoveStrategy({ map: "desertland", x: 180, y: -675 })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
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