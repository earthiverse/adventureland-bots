import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"

export function constructHarpySetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({
        contexts: contexts,
        disableCheckDB: true,
        typeList: ["harpy"],
    })
    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
            },
            maximumTargets: 1,
            type: "harpy",
        }),
        move: moveStrategy,
    }
    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
            },
            maximumTargets: 1,
            type: "harpy",
        }),
        move: moveStrategy,
    }
    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            enableEquipForStomp: true,
            generateEnsureEquipped: {
                attributes: ["armor", "str", "attack"],
            },
            maximumTargets: 1,
            type: "harpy",
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "harpy_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "harpy_mage,priest",
                characters: [mageConfig, priestConfig],
            },
            {
                id: "harpy_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
        ],
    }
}
