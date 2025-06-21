import { MonsterName, PingCompensatedCharacter, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

class WarriorSkeletorAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        // No Splash Damage
        super.onApply(bot)
        this.options.disableCleave = true
        delete this.options.enableEquipForCleave
        delete this.options.enableGreedyAggro
    }
}

export function constructSkeletorSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("skeletor")
    const typeList: MonsterName[] = ["skeletor", "cgoo"]

    const priestConfig: CharacterConfig = {
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
        move: moveStrategy,
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorSkeletorAttackStrategy({
            contexts: contexts,
            disableCleave: true,
            generateEnsureEquipped: {
                attributes: ["armor", "str", "attack"],
            },
            typeList: typeList,
        }),
        move: moveStrategy,
    }

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
                        move: moveStrategy,
                    },
                    priestConfig,
                    warriorConfig,
                ],
            },
            {
                id: "skeletor_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
            {
                id: "skeletor_priest,ranger",
                characters: [
                    priestConfig,
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "dex", "attack"],
                            },
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
