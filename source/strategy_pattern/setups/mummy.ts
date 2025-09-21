import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { MAGE_SPLASH_WEAPONS, WARRIOR_SPLASH_WEAPONS, ZAPPER_CRING, ZAPPER_STRRING } from "./equipment.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructMummySetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
                prefer: ZAPPER_CRING,
            },
            type: "mummy",
        }),
        move: new HoldPositionMoveStrategy({ map: "spookytown", x: 270, y: -1129 }),
    }

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["armor", "blast", "explosion"],
                prefer: {
                    ...ZAPPER_CRING,
                    ...MAGE_SPLASH_WEAPONS,
                },
            },
            type: "mummy",
        }),
        move: new HoldPositionMoveStrategy({ map: "spookytown", x: 250, y: -1129 }),
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            generateEnsureEquipped: {
                attributes: ["armor", "blast", "explosion"],
                prefer: {
                    ...ZAPPER_STRRING,
                    ...WARRIOR_SPLASH_WEAPONS,
                },
            },
            enableGreedyAggro: true,
            type: "mummy",
        }),
        move: new HoldPositionMoveStrategy({ map: "spookytown", x: 230, y: -1129 }),
    }

    const rangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["range"],
            },
            type: "mummy",
        }),
        move: new HoldPositionMoveStrategy({ map: "spookytown", x: 230, y: -1129 }),
    }

    return {
        configs: [
            {
                id: "mummy_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "mummy_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
            {
                id: "mummy_priest,ranger",
                characters: [priestConfig, rangerConfig],
            },
        ],
    }
}
