import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, KiteMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { RETURN_HIGHEST, WARRIOR_SPLASH_WEAPONS, ZAPPER_STRRING } from "./equipment.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructMoleSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("mole", {
        idlePosition: {
            map: "tunnel",
            x: 0,
            y: -735,
        },
    })
    const kiteMoveStrategy = new KiteMoveStrategy({ contexts: contexts, typeList: ["mole"] })

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
            },
            type: "mole",
        }),
        move: moveStrategy,
    }
    const kitePriestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                prefer: {
                    mainhand: { name: "froststaff", filters: RETURN_HIGHEST },
                },
            },
            type: "mole",
        }),
        move: kiteMoveStrategy,
        require: {
            items: ["froststaff"],
        },
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            generateEnsureEquipped: {
                attributes: ["armor", "str", "blast", "explosion"],
                prefer: {
                    ...WARRIOR_SPLASH_WEAPONS,
                    ...ZAPPER_STRRING,
                },
            },
            enableGreedyAggro: true,
            type: "mole",
        }),
        move: moveStrategy,
    }

    // Support ranger shouldn't tank moles
    const supportRangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["armor"],
            },
            hasTarget: true,
            maximumTargets: 0,
            type: "mole",
        }),
        move: kiteMoveStrategy,
    }
    const kiteRangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                prefer: {
                    mainhand: { name: "frostbow", filters: RETURN_HIGHEST },
                },
            },
        }),
        move: kiteMoveStrategy,
        require: {
            items: ["frostbow"],
        },
    }

    return {
        configs: [
            {
                id: "mole_priest,warrior,ranger",
                characters: [priestConfig, warriorConfig, supportRangerConfig],
            },
            {
                id: "mole_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
            {
                id: "mole_priest",
                characters: [kitePriestConfig],
            },
            {
                id: "mole_ranger",
                characters: [kiteRangerConfig],
            },
        ],
    }
}
