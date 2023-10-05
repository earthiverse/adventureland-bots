import { MonsterName, PingCompensatedCharacter, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

class WarriorSkeletorAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        // No Splash Damage
        this.options.disableCleave = true
        delete this.options.enableEquipForCleave
        delete this.options.enableGreedyAggro
        super.onApply(bot)
    }
}

export function constructSkeletorSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("skeletor")
    const typeList: MonsterName[] = ["skeletor", "cgoo"]
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
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
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
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            typeList: typeList,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorSkeletorAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "attack"],
                            },
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
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                            },
                            typeList: typeList,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorSkeletorAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "attack"],
                            },
                            typeList: typeList,
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}