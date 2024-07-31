import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { RETURN_HIGHEST } from "./equipment.js"

const typeList: MonsterName[] = ["phoenix"]

export function constructPhoenixSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const phoenixMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: typeList })

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["attack", "luck", "int"],
                prefer: {
                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                },
            },
            typeList: typeList,
        }),
        move: phoenixMoveStrategy,
    }
    const rogueConfig: CharacterConfig = {
        ctype: "rogue",
        attack: new RogueAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["attack", "luck", "dex"],
            },
            typeList: typeList,
        }),
        move: phoenixMoveStrategy,
    }
    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["attack", "luck", "int"],
                prefer: {
                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                },
            },
            typeList: typeList,
        }),
        move: phoenixMoveStrategy,
    }
    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            enableEquipForStomp: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["attack", "luck", "str"],
                prefer: {
                    mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
                },
            },
            typeList: typeList,
        }),
        move: phoenixMoveStrategy,
    }

    return {
        configs: [
            {
                id: "phoenix_triple_mage",
                characters: [mageConfig, mageConfig, mageConfig],
            },
            {
                id: "phoenix_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "phoenix_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
            {
                id: "phoenix_mage",
                characters: [mageConfig],
            },
            {
                id: "phoenix_rogue",
                characters: [rogueConfig],
            },
        ],
    }
}

export function constructPhoenixHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const phoenixMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: typeList })

    return {
        configs: [
            {
                id: "phoenix_helper_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy,
                    },
                ],
            },
            {
                id: "phoenix_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy,
                    },
                ],
            },
            {
                id: "phoenix_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableAbsorb: true,
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy,
                    },
                ],
            },
            {
                id: "phoenix_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy,
                    },
                ],
            },
            {
                id: "phoenix_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy,
                    },
                ],
            },
            {
                id: "phoenix_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            typeList: typeList,
                        }),
                        move: phoenixMoveStrategy,
                    },
                ],
            },
        ],
    }
}
