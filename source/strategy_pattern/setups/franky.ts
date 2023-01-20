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
import { Setup } from "./base"
import { PRIEST_ARMOR } from "./equipment.js"

class MageFrankyAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        if (bot.isPVP()) {
            // No splash damage
            this.options.ensureEquipped.mainhand = { name: "firestaff", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "wbookhs", filters: { returnHighestLevel: true } }
        } else {
            // Splash damage & additional monsters
            this.options.ensureEquipped.mainhand = { name: "gstaff", filters: { returnHighestLevel: true } }
            delete this.options.ensureEquipped.offhand
        }
        super.onApply(bot)
    }
}

class PriestFrankyAttackStrategy extends PriestAttackStrategy {
    public onApply(bot: Priest): void {
        if (bot.isPVP()) {
            this.options.ensureEquipped.orb = { name: "jacko", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.ring1 = { name: "cring", filters: { returnHighestLevel: true } }
        } else {
            // Additional monsters
            this.options.ensureEquipped.orb = { name: "jacko", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.ring1 = { name: "zapper", filters: { returnHighestLevel: true } }
        }
        super.onApply(bot)
    }
}

class WarriorFrankyAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        if (bot.isPVP()) {
            // No Splash Damage
            this.options.disableCleave = true
            this.options.ensureEquipped.mainhand = { name: "fireblade", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.offhand = { name: "fireblade", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.ring1 = { name: "strring", filters: { returnHighestLevel: true } },
            delete this.options.enableEquipForCleave
        } else {
            // Splash Damage & additional monsters
            delete this.options.disableCleave
            this.options.ensureEquipped.mainhand = { name: "vhammer", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.offhand = { name: "ololipop", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.ring1 = { name: "zapper", filters: { returnHighestLevel: true } }
            this.options.enableEquipForCleave = true
        }
        super.onApply(bot)
    }
}

const frankyMoveStrategy = new ImprovedMoveStrategy("franky", { idlePosition: frankyIdlePosition })

export function constructFrankySetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "franky_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageFrankyAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: {
                                mainhand: { name: "gstaff", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["nerfedmummy", "franky"]
                        }),
                        move: frankyMoveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestFrankyAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            typeList: ["nerfedmummy", "franky"],
                        }),
                        move: frankyMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorFrankyAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            ensureEquipped: {
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["nerfedmummy", "franky"]
                        }),
                        move: frankyMoveStrategy
                    }
                ]
            },
            {
                id: "franky_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestFrankyAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            typeList: ["nerfedmummy", "franky"],
                        }),
                        move: frankyMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorFrankyAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "bataxe", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["nerfedmummy", "franky"]
                        }),
                        move: frankyMoveStrategy
                    }
                ]
            },
            {
                id: "franky_priest,mage",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestFrankyAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            typeList: ["nerfedmummy", "franky"],
                        }),
                        move: frankyMoveStrategy
                    },
                    {
                        ctype: "mage",
                        attack: new MageFrankyAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: {
                                mainhand: { name: "gstaff", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["nerfedmummy", "franky"]
                        }),
                        move: frankyMoveStrategy
                    },
                ]
            },
        ]
    }
}

export function constructFrankyHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "franky_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: ["nerfedmummy", "franky"], hasTarget: true, maximumTargets: 0 }),
                        move: frankyMoveStrategy
                    }
                ]
            },
            {
                id: "franky_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: ["nerfedmummy", "franky"], hasTarget: true, maximumTargets: 0 }),
                        move: frankyMoveStrategy
                    }
                ]
            },
            {
                id: "franky_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, typeList: ["nerfedmummy", "franky"], hasTarget: true, maximumTargets: 0 }),
                        move: frankyMoveStrategy
                    }
                ]
            },
            {
                id: "franky_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: ["nerfedmummy", "franky"], hasTarget: true, maximumTargets: 0 }),
                        move: frankyMoveStrategy
                    }
                ]
            },
            {
                id: "franky_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: ["nerfedmummy", "franky"], hasTarget: true, maximumTargets: 0 }),
                        move: frankyMoveStrategy
                    }
                ]
            },
            {
                id: "franky_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, disableCleave: true, typeList: ["nerfedmummy", "franky"], hasTarget: true, maximumTargets: 0 }),
                        move: frankyMoveStrategy
                    }
                ]
            }
        ]
    }
}