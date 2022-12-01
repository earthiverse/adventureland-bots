import { MonsterName, PingCompensatedCharacter, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_ARMOR, PRIEST_ARMOR, WARRIOR_NORMAL } from "./equipment.js"

class WarriorSkeletorAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        if (bot.isPVP()) {
            // No Splash Damage
            this.options.disableCleave = true
            delete this.options.enableEquipForCleave
            delete this.options.enableGreedyAggro
        } else {
            // Additional Cleave Damage
            delete this.options.disableCleave
            this.options.enableEquipForCleave = true
            this.options.enableGreedyAggro = true
        }
        super.onApply(bot)
    }
}

const moveStrategy = new ImprovedMoveStrategy("skeletor")
const typeList: MonsterName[] = ["skeletor", "cgoo"]

export function constructSkeletorSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "skeletor_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            ensureEquipped: { ...MAGE_ARMOR },
                            typeList: typeList,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            typeList: typeList,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorSkeletorAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            ensureEquipped: { ...WARRIOR_NORMAL },
                            typeList: typeList,
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "skeletor_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            typeList: typeList,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            ensureEquipped: { ...WARRIOR_NORMAL },
                            typeList: typeList,
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}