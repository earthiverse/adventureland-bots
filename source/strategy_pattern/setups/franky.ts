import { Mage, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { frankyIdlePosition } from "../../base/locations.js"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
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
                        move: new ImprovedMoveStrategy(["franky"], { idlePosition: frankyIdlePosition })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestFrankyAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            typeList: ["franky", "nerfedmummy"],
                        }),
                        move: new ImprovedMoveStrategy("franky", { idlePosition: frankyIdlePosition })
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
                        move: new ImprovedMoveStrategy(["franky"], { idlePosition: frankyIdlePosition })
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
                            type: "franky",
                        }),
                        move: new ImprovedMoveStrategy("franky", { idlePosition: frankyIdlePosition })
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
                        move: new ImprovedMoveStrategy(["franky"], { idlePosition: frankyIdlePosition })
                    }
                ]
            },
        ]
    }
}