import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { ZAPPER_CRING } from "./equipment.js"

export function constructBBPomPomSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("bbpompom")

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["blast", "explosion"],
                prefer: ZAPPER_CRING,
            },
            type: "bbpompom",
        }),
        move: moveStrategy,
    }

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            enableAbsorbToTank: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["int", "attack"],
            },
            type: "bbpompom",
        }),
        move: moveStrategy,
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            generateEnsureEquipped: {
                attributes: ["blast", "explosion"],
            },
            type: "bbpompom",
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "bbpompom_mage,priest",
                characters: [mageConfig, priestConfig],
            },
            {
                id: "bbpompom_warrior,priest",
                characters: [warriorConfig, priestConfig],
            },
            {
                id: "bbpompom_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
        ],
    }
}
