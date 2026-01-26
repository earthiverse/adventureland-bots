import { Mage, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { frankyIdlePosition } from "../../base/locations.js"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base.js"
import { RETURN_HIGHEST, UNEQUIP } from "./equipment.js"

// TODO: Improve PVP
class MageFrankyAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        if (!this.options.generateEnsureEquipped) this.options.generateEnsureEquipped = {}
        if (!this.options.generateEnsureEquipped.prefer) this.options.generateEnsureEquipped.prefer = {}
        if (bot.isPVP()) {
            // No splash damage
            this.options.generateEnsureEquipped.prefer.mainhand = {
                name: "firestaff",
                filters: RETURN_HIGHEST,
            }
            this.options.generateEnsureEquipped.prefer.offhand = {
                name: "wbookhs",
                filters: RETURN_HIGHEST,
            }
        } else {
            // Splash damage & additional monsters
            this.options.generateEnsureEquipped.prefer.mainhand = {
                name: "gstaff",
                filters: RETURN_HIGHEST,
            }
            this.options.generateEnsureEquipped.prefer.offhand = UNEQUIP
        }
        super.onApply(bot)
    }
}

class PriestFrankyAttackStrategy extends PriestAttackStrategy {
    public onApply(bot: Priest): void {
        if (!this.options.generateEnsureEquipped) this.options.generateEnsureEquipped = {}
        if (!this.options.generateEnsureEquipped.prefer) this.options.generateEnsureEquipped.prefer = {}
        if (bot.isPVP()) {
            this.options.generateEnsureEquipped.prefer.ring1 = { name: "cring", filters: RETURN_HIGHEST }
            this.options.generateEnsureEquipped.prefer.ring2 = { name: "cring", filters: RETURN_HIGHEST }
        } else {
            // Additional monsters
            this.options.generateEnsureEquipped.prefer.ring1 = { name: "zapper", filters: RETURN_HIGHEST }
            this.options.generateEnsureEquipped.prefer.ring2 = { name: "cring", filters: RETURN_HIGHEST }
        }
        super.onApply(bot)
    }
}

class WarriorFrankyAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        if (!this.options.generateEnsureEquipped) this.options.generateEnsureEquipped = {}
        if (!this.options.generateEnsureEquipped.prefer) this.options.generateEnsureEquipped.prefer = {}
        if (bot.isPVP()) {
            // No Splash Damage
            this.options.disableCleave = true
            this.options.generateEnsureEquipped.prefer.mainhand = {
                name: "fireblade",
                filters: RETURN_HIGHEST,
            }
            this.options.generateEnsureEquipped.prefer.offhand = {
                name: "fireblade",
                filters: RETURN_HIGHEST,
            }
            this.options.generateEnsureEquipped.prefer.ring1 = {
                name: "strring",
                filters: RETURN_HIGHEST,
            }
            this.options.generateEnsureEquipped.prefer.ring2 = {
                name: "strring",
                filters: RETURN_HIGHEST,
            }
            delete this.options.enableEquipForCleave
        } else {
            // Splash Damage & additional monsters
            delete this.options.disableCleave
            this.options.generateEnsureEquipped.prefer.mainhand = {
                name: "vhammer",
                filters: RETURN_HIGHEST,
            }
            this.options.generateEnsureEquipped.prefer.offhand = { name: "ololipop", filters: RETURN_HIGHEST }
            this.options.generateEnsureEquipped.prefer.ring1 = { name: "zapper", filters: RETURN_HIGHEST }
            this.options.generateEnsureEquipped.prefer.ring2 = {
                name: "strring",
                filters: RETURN_HIGHEST,
            }
            this.options.enableEquipForCleave = true
        }
        super.onApply(bot)
    }
}

const frankyMoveStrategy = new ImprovedMoveStrategy("franky", { idlePosition: frankyIdlePosition })

export function constructFrankySetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestFrankyAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            enableAbsorbToTank: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["int", "attack"],
                prefer: {
                    orb: { name: "jacko", filters: RETURN_HIGHEST },
                },
            },
            typeList: ["nerfedmummy", "franky"],
        }),
        move: frankyMoveStrategy,
    }
    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageFrankyAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["int", "blast", "explosion"],
            },
            typeList: ["nerfedmummy", "franky"],
        }),
        move: frankyMoveStrategy,
    }
    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorFrankyAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            generateEnsureEquipped: {
                attributes: ["str", "blast", "explosion"],
            },
            typeList: ["nerfedmummy", "franky"],
        }),
        move: frankyMoveStrategy,
    }
    const rogueConfig: CharacterConfig = {
        ctype: "rogue",
        attack: new RogueAttackStrategy({
            contexts,
            generateEnsureEquipped: {
                prefer: {
                    mainhand: { name: "cclaw", filters: RETURN_HIGHEST },
                    offhand: { name: "firestars", filters: RETURN_HIGHEST },
                },
            },
            typeList: ["nerfedmummy", "franky"],
        }),
        move: frankyMoveStrategy,
    }
    const rangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                prefer: {
                    mainhand: { name: "pouchbow", filters: RETURN_HIGHEST },
                    offhand: { name: "alloyquiver", filters: RETURN_HIGHEST },
                },
            },
            typeList: ["nerfedmummy", "franky"],
        }),
        move: frankyMoveStrategy,
    }
    return {
        configs: [
            {
                id: "franky_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "franky_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
            {
                id: "franky_priest,mage",
                characters: [priestConfig, mageConfig],
            },
            {
                id: "franky_priest,ranger",
                characters: [priestConfig, rangerConfig],
            },
            {
                id: "franky_priest,rogue,rogue",
                characters: [priestConfig, rogueConfig, rogueConfig],
            },
        ],
    }
}

export function constructFrankyHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "franky_mage_helper",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            typeList: ["nerfedmummy", "franky"],
                            hasTarget: true,
                        }),
                        move: frankyMoveStrategy,
                    },
                ],
            },
            {
                id: "franky_paladin_helper",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            typeList: ["nerfedmummy", "franky"],
                            hasTarget: true,
                        }),
                        move: frankyMoveStrategy,
                    },
                ],
            },
            {
                id: "franky_priest_helper",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableAbsorb: true,
                            typeList: ["nerfedmummy", "franky"],
                            hasTarget: true,
                        }),
                        move: frankyMoveStrategy,
                    },
                ],
            },
            {
                id: "franky_ranger_helper",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            typeList: ["nerfedmummy", "franky"],
                            hasTarget: true,
                        }),
                        move: frankyMoveStrategy,
                    },
                ],
            },
            {
                id: "franky_rogue_helper",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                prefer: {
                                    // Stab for extra stacked damage
                                    mainhand: { name: "claw", filters: RETURN_HIGHEST },
                                },
                            },
                            typeList: ["nerfedmummy", "franky"],
                            hasTarget: true,
                        }),
                        move: frankyMoveStrategy,
                    },
                ],
            },
            {
                id: "franky_warrior_helper",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            disableCleave: true,
                            typeList: ["nerfedmummy", "franky"],
                            hasTarget: true,
                        }),
                        move: frankyMoveStrategy,
                    },
                ],
            },
        ],
    }
}
