import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpreadOutImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"

export function constructBoarSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpreadOutImprovedMoveStrategy("boar")
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
    const rangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["courage", "range"],
            },
            type: "boar",
        }),
        move: moveStrategy,
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
                characters: [rangerConfig, rangerConfig, rangerConfig],
            },
            {
                id: "boar_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "boar_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
        ],
    }
}
