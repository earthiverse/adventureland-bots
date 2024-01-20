import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

const typeList: MonsterName[] = ["cgoo"]

export function constructCGooSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const cgooMoveStrategy = new ImprovedMoveStrategy("cgoo")

    return {
        configs: [
            {
                id: "cgoo_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: { attributes: ["armor", "str", "attack"] },
                            typeList: typeList,
                        }),
                        move: cgooMoveStrategy,
                    }
                ]
            },
            {
                id: "cgoo_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "int", "attack"] },
                            typeList: typeList,
                        }),
                        move: cgooMoveStrategy
                    },
                ]
            },
            {
                id: "cgoo_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            typeList: typeList,
                        }),
                        move: cgooMoveStrategy
                    },
                ]
            },
            {
                id: "cgoo_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "dex", "attack"] },
                            typeList: typeList,
                        }),
                        move: cgooMoveStrategy
                    },
                ]
            },
            {
                id: "cgoo_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "dex", "attack"] },
                            typeList: typeList,
                        }),
                        move: cgooMoveStrategy
                    },
                ]
            },
            {
                id: "cgoo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "int", "attack"] },
                            typeList: typeList,
                        }),
                        move: cgooMoveStrategy
                    },
                ]
            },
        ]
    }
}