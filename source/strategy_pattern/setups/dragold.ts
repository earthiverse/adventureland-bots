import { MonsterName, PingCompensatedCharacter, Rogue, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

// TODO: Better PVP setup
class WarriorDragoldAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        super.onApply(bot)
        if (bot.isPVP()) {
            // No Splash Damage
            this.options.disableCleave = true
            delete this.options.enableEquipForCleave
            delete this.options.enableGreedyAggro
        } else {
            // Additional Cleave Damage
            delete this.options.disableCleave
            this.options.enableEquipForCleave = true
            this.options.enableGreedyAggro = true
        }
    }
}

// TODO: Add a strategy for mages to blink if dragold's fire projectile is incoming
// TODO: Add a move strategy to attack from the furthest position away to give mages time to blink, or other characters to run and potentially avoid the projectile

export function constructDragoldSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["dragold"] })
    const types: MonsterName[] = ["goldenbat", "dragold", "bat"]

    return {
        configs: [
            {
                id: "dragold_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "blast", "explosion"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableHealStrangers: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "attack"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorDragoldAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "str", "blast", "explosion"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "dragold_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableHealStrangers: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "attack"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "str", "blast", "explosion"],
                            },
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}

export function constructDragoldHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["dragold"] })
    const types: MonsterName[] = ["dragold", "bat"]

    return {
        configs: [
            {
                id: "dragold_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            typeList: types,
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "dragold_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            typeList: types,
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "dragold_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableAbsorb: true,
                            enableHealStrangers: true,
                            typeList: types,
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "dragold_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            typeList: types,
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "dragold_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            typeList: types,
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "dragold_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            disableCleave: true,
                            typeList: types,
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
