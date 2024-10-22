import { PingCompensatedCharacter, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base.js"
import { RETURN_HIGHEST } from "./equipment.js"

class WarriorMrGreenAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        if (bot.serverData.name === "PVP") {
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
        super.onApply(bot)
    }
}

export function constructMrGreenSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("mrgreen")

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            disableZapper: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
                prefer: { mainhand: { name: "firestaff", filters: RETURN_HIGHEST } },
            },
            type: "mrgreen",
        }),
        move: moveStrategy,
    }

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            enableGreedyAggro: true,
            enableHealStrangers: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
                prefer: {
                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                },
            },
            type: "mrgreen",
        }),
        move: moveStrategy,
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorMrGreenAttackStrategy({
            contexts: contexts,
            disableCleave: true,
            generateEnsureEquipped: {
                attributes: ["armor", "str", "attack"],
                prefer: {
                    mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
                    offhand: { name: "fireblade", filters: RETURN_HIGHEST },
                },
            },
            type: "mrgreen",
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "mrgreen_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "mrgreen_mage,priest",
                characters: [priestConfig, mageConfig],
            },
            {
                id: "mrgreen_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
        ],
    }
}

export function constructMrGreenHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "mrgreen_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "int", "attack"] },
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "int", "attack"] },
                            disableAbsorb: true,
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "dex", "attack"] },
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "dex", "attack"] },
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            disableCleave: true,
                            generateEnsureEquipped: { attributes: ["armor", "str", "attack"] },
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
        ],
    }
}
