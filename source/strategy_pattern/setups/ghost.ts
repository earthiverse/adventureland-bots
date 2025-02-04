import { PingCompensatedCharacter, Priest } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { BLASTER, RETURN_HIGHEST, ZAPPER_CRING } from "./equipment.js"

class PriestGhostAttackStrategy extends PriestAttackStrategy {
    protected async attack(bot: Priest): Promise<void> {
        if (this.shouldAttack(bot)) {
            // Heal ghost to farm life essence
            if (bot.canUse("heal")) {
                entity: for (const entity of bot.getEntities({ type: "ghost", withinRange: bot.range })) {
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
            y: -1440,
        },
    })

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestGhostAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["resistance", "int", "attack"],
                prefer: ZAPPER_CRING,
            },
            enableAbsorbToTank: true,
            enableGreedyAggro: true,
            typeList: ["ghost", "tinyp"],
        }),
        move: moveStrategy,
    }

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["resistance", "blast", "explosion"],
                prefer: BLASTER,
            },
            typeList: ["ghost", "tinyp"],
        }),
        move: moveStrategy,
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            disableAgitate: true,
            disableZapper: true,
            enableEquipForCleave: true,
            generateEnsureEquipped: {
                attributes: ["attack", "blast", "explosion"],
                prefer: {
                    mainhand: { name: "vhammer", filters: RETURN_HIGHEST },
                    offhand: { name: "ololipop", filters: RETURN_HIGHEST },
                },
            },
            typeList: ["ghost", "tinyp"],
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "ghost_priest,mage,warrior",
                characters: [priestConfig, mageConfig, warriorConfig],
            },
            {
                id: "ghost_priest,mage",
                characters: [priestConfig, mageConfig],
            },
            {
                id: "ghost_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
        ],
    }
}
