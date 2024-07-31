import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, KiteMonsterMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { RETURN_HIGHEST } from "./equipment.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructMoleSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("mole", {
        idlePosition: {
            map: "tunnel",
            x: 0,
            y: -735,
        },
    })
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
    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            generateEnsureEquipped: {
                attributes: ["armor", "str", "blast", "explosion"],
                prefer: {
                    ring1: { name: "zapper", filters: RETURN_HIGHEST },
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
        move: new KiteMonsterMoveStrategy({ contexts: contexts, typeList: ["mole"] }),
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
        ],
    }
}
