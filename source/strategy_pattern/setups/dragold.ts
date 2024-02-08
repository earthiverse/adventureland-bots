import { MonsterName, PingCompensatedCharacter, Rogue, Warrior } from "alclient"
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

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            disableZapper: true,
            generateEnsureEquipped: {
                attributes: ["resistance", "int", "blast", "explosion"],
                prefer: {
                    mainhand: { name: "gstaff", filters: RETURN_HIGHEST },
                }
            },
            typeList: types,
        }),
        move: moveStrategy,
    }
    const priestConfig: CharacterConfig = {
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
    }
    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorDragoldAttackStrategy({
            contexts: contexts,
            disableCleave: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["resistance", "str", "blast", "explosion"],
                prefer: {
                    mainhand: { name: "vhammer", filters: RETURN_HIGHEST },
                    offhand: { name: "ololipop", filters: RETURN_HIGHEST }
                }
            },
            typeList: types,
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "dragold_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig,],
            },
            {
                id: "dragold_priest,warrior",
                characters: [priestConfig, warriorConfig,],
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
                id: "dragold_mage_helper",
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
                id: "dragold_paladin_helper",
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
                id: "dragold_priest_helper",
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
                id: "dragold_ranger_helper",
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
                id: "dragold_rogue_helper",
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
                id: "dragold_warrior_helper",
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
