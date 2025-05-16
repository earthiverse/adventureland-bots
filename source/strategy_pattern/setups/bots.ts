import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import {
    JACKO,
    MAGE_SPLASH_WEAPONS,
    RETURN_HIGHEST,
    SUPERMITTENS,
    WARRIOR_SPLASH_WEAPONS,
    ZAPPER_CRING,
} from "./equipment.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"

export function constructBotsSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const typeList: MonsterName[] = ["goldenbot", "sparkbot", "targetron"]
    const moveStrategy = new ImprovedMoveStrategy(typeList)

    const rogueConfig: CharacterConfig = {
        ctype: "rogue",
        attack: new RogueAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["xp"],
                prefer: {
                    mainhand: { name: "cclaw", filters: RETURN_HIGHEST },
                    offhand: { name: "cclaw", filters: RETURN_HIGHEST },
                    orb: { name: "test_orb", filters: RETURN_HIGHEST },
                },
            },
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "bots_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                                prefer: { ...MAGE_SPLASH_WEAPONS, ...ZAPPER_CRING, ...JACKO, ...SUPERMITTENS },
                            },
                            typeList,
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            enableGreedyAggro: ["sparkbot"],
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"],
                                prefer: { ...ZAPPER_CRING },
                            },
                            typeList,
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            enableGreedyAggro: ["goldenbot", "targetron"],
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "attack"],
                                prefer: { ...WARRIOR_SPLASH_WEAPONS, ...SUPERMITTENS },
                            },
                            typeList,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "bots_temp_rogue,rogue,rogue",
                characters: [rogueConfig, rogueConfig, rogueConfig],
            },
        ],
    }
}
