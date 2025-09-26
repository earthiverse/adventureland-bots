import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { KiteMonsterMoveStrategy, SpreadOutImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { RETURN_HIGHEST } from "./equipment.js"

export function constructBoarSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpreadOutImprovedMoveStrategy("boar")
    const kiteMoveStrategy = new KiteMonsterMoveStrategy({ contexts: contexts, typeList: ["boar"] })

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["int", "blast", "explosion"],
            },
            type: "boar",
        }),
        move: moveStrategy,
    }

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["int", "attack"],
            },
            type: "boar",
        }),
        move: moveStrategy,
    }

    const tripleRangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            disableHuntersMark: true,
            disableSuperShot: true,
            generateEnsureEquipped: {
                attributes: ["courage", "range"],
            },
            type: "boar",
        }),
        move: moveStrategy,
    }
    const kiteRangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            disableHuntersMark: true,
            disableSuperShot: true,
            generateEnsureEquipped: {
                prefer: {
                    mainhand: { name: "frostbow", filters: RETURN_HIGHEST },
                },
            },
            type: "boar",
        }),
        move: kiteMoveStrategy,
        require: {
            items: ["frostbow"],
        },
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            generateEnsureEquipped: {
                attributes: ["str", "blast", "explosion"],
            },
            enableGreedyAggro: true,
            type: "boar",
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "boar_triple_ranger",
                characters: [tripleRangerConfig, tripleRangerConfig, tripleRangerConfig],
            },
            {
                id: "boar_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "boar_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
            {
                id: "boar_ranger",
                characters: [kiteRangerConfig],
            },
        ],
    }
}
