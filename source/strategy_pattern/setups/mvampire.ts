import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructMVampireSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["mvampire"] })

    return {
        configs: [
            {
                id: "mvampire_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "luck", "blast", "explosion"],
                            },
                            typeList: ["mvampire", "goldenbat", "bat"],
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["attack", "luck"],
                            },
                            typeList: ["mvampire", "goldenbat", "bat"],
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["attack", "luck", "blast", "explosion"],
                            },
                            typeList: ["mvampire", "goldenbat", "bat"],
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "mvampire_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["dex", "attack"],
                            },
                            typeList: ["mvampire", "goldenbat", "bat"],
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
