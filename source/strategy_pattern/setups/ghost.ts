import AL, { PingCompensatedCharacter, Priest } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy, ImprovedMoveStrategy, MoveInCircleMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR, WARRIOR_SPLASH } from "./equipment.js"

class PriestGhostAttackStrategy extends PriestAttackStrategy {
    protected async attack(bot: Priest): Promise<void> {
        if (this.shouldAttack(bot)) {
            // Heal ghost to farm life essence
            if (bot.canUse("heal")) {
                entity:
                for (const entity of bot.getEntities({ type: "ghost", withinRange: bot.range })) {
                    if (entity.s.healed) continue
                    for (const projectile of bot.projectiles.values()) {
                        if (projectile.type !== "heal") continue // Not a healing projectile
                        continue entity // There is a healing projectile already going towards this entity
                    }

                    await bot.healSkill(entity.id).catch(console.error)
                }
            }
        }

        return super.attack(bot)
    }
}

export function constructGhostSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("ghost", {
        idlePosition: {
            map: "halloween",
            x: -80,
            y: -1440
        }
    })

    return {
        configs: [
            {
                id: "ghost_priest,mage,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestGhostAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            enableGreedyAggro: true,
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "ghost_priest,mage",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestGhostAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            enableGreedyAggro: true,
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: moveStrategy
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
                            ensureEquipped: { ...PRIEST_ARMOR },
                            enableGreedyAggro: true,
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: ["ghost", "tinyp"],
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}