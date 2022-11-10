import AL, { PingCompensatedCharacter, Priest } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR, WARRIOR_SPLASH } from "./equipment.js"

class PriestGhostAttackStrategy extends PriestAttackStrategy {
    protected async attack(bot: Priest): Promise<void> {
        if (this.shouldAttack(bot)) {
            // Heal ghost to farm life essence
            if (bot.canUse("heal")) {
                for (const entity of bot.getEntities({ type: "ghost", withinRange: bot.range })) {
                    if (entity.s.healed) continue

                    await bot.healSkill(entity.id)
                }
            }
        }

        return super.attack(bot)
    }
}

export function constructGhostSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const spawn = AL.Pathfinder.locateMonster("ghost")[0]

    return {
        configs: [
            {
                id: "ghost_priest,mage",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestGhostAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            enableGreedyAggro: true,
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 })
                    },
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: new HoldPositionMoveStrategy(spawn)
                    }
                ]
            },
            {
                id: "ghost_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestGhostAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            enableGreedyAggro: true,
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: new MoveInCircleMoveStrategy({ center: spawn, radius: 20, sides: 8 })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            enableGreedyAggro: true,
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: new HoldPositionMoveStrategy(spawn)
                    }
                ]
            },
        ]
    }
}