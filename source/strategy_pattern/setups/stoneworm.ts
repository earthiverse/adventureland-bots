import AL, { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, KiteMonsterMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Requirements, Setup } from "./base.js"
import { MAGE_SPLASH, PRIEST_LUCK, WARRIOR_SPLASH } from "./equipment.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"

export function constructStoneWormSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("stoneworm")

    const mageStrategy: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                prefer: { ...MAGE_SPLASH },
            },
            type: "stoneworm",
        }),
        move: moveStrategy,
    }

    const priestStrategy: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                prefer: { ...PRIEST_LUCK },
            },
            type: "stoneworm",
        }),
        move: moveStrategy,
    }

    const warriorStrategy: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                prefer: { ...WARRIOR_SPLASH },
            },
            type: "stoneworm",
        }),
        move: moveStrategy,
    }

    const soloMoveStrategy = new KiteMonsterMoveStrategy({
        contexts: contexts,
        disableCheckDB: true,
        typeList: ["stoneworm"],
    })
    const soloRogueStrategy: CharacterConfig = {
        ctype: "rogue",
        attack: new RogueAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: { attributes: ["range"] },
            type: "stoneworm",
        }),
        move: soloMoveStrategy,
    }

    const soloRangerStrategy: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: { attributes: ["range"] },
            type: "stoneworm",
        }),
        move: soloMoveStrategy,
    }

    return {
        configs: [
            {
                id: "stoneworm_mage,priest,warrior",
                characters: [mageStrategy, priestStrategy, warriorStrategy],
            },
            {
                id: "stoneworm_priest",
                characters: [priestStrategy],
            },
            {
                id: "stoneworm_rogue",
                characters: [soloRogueStrategy],
            },
            {
                id: "stoneworm_ranger",
                characters: [soloRangerStrategy],
            },
        ],
    }
}

export function constructStoneWormHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new KiteMonsterMoveStrategy({
        contexts: contexts,
        disableCheckDB: true,
        typeList: ["stoneworm"],
    })
    const requirements: Requirements = {
        items: ["jacko"],
        range: AL.Game.G.monsters.stoneworm.range + 50,
        speed: AL.Game.G.monsters.stoneworm.charge,
    }

    return {
        configs: [
            {
                id: "stoneworm_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            type: "stoneworm",
                        }),
                        move: moveStrategy,
                        require: requirements,
                    },
                ],
            },
            {
                id: "stoneworm_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            type: "stoneworm",
                        }),
                        move: moveStrategy,
                        require: requirements,
                    },
                ],
            },
        ],
    }
}
