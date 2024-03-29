import { MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

const attackTypes: MonsterName[] = ["armadillo", "phoenix"]
const moveTypes: MonsterName[] = ["armadillo"]

export function constructArmadilloSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy(moveTypes)

    return {
        configs: [
            {
                id: "armadillo_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["int", "blast", "explosion"]
                            },
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "armadillo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["int", "attack"]
                            },
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "armadillo_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["dex", "attack"]
                            },
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}

export function constructArmadilloHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy(moveTypes)

    return {
        configs: [
            {
                id: "armadillo_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "armadillo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "armadillo_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            typeList: attackTypes
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}