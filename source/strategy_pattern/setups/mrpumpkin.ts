import { Mage, MonsterName, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_NORMAL, PRIEST_ARMOR, WARRIOR_NORMAL } from "./equipment.js"

const NON_PVP_MONSTERS: MonsterName[] = ["mrpumpkin", "phoenix", "xscorpion", "minimush", "tinyp"]

class MageMrPumpkinAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        super.onApply(bot)
        if (bot.serverData.name === "PVP") {
            // No splash damage
            this.options.ensureEquipped.mainhand = { name: "firestaff", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "wbookhs", filters: { returnHighestLevel: true } }
            this.options.typeList = ["mrpumpkin"]
            delete this.options.enableGreedyAggro
        } else {
            // Splash damage & additional monsters
            this.options.ensureEquipped.mainhand = { name: "gstaff", filters: { returnHighestLevel: true } }
            delete this.options.ensureEquipped.offhand
            this.options.typeList = NON_PVP_MONSTERS
            this.options.enableGreedyAggro = true
        }
    }
}

class PriestMrPumpkinAttackStrategy extends PriestAttackStrategy {
    public onApply(bot: Priest): void {
        super.onApply(bot)
        if (bot.serverData.name === "PVP") {
            this.options.ensureEquipped.orb = { name: "jacko", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.ring1 = { name: "cring", filters: { returnHighestLevel: true } }
            this.options.typeList = ["mrpumpkin"]
        } else {
            // Additional monsters
            this.options.ensureEquipped.orb = { name: "jacko", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.ring1 = { name: "zapper", filters: { returnHighestLevel: true } }
            this.options.typeList = NON_PVP_MONSTERS
        }
    }
}

class WarriorMrPumpkinAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        super.onApply(bot)
        if (bot.serverData.name === "PVP") {
            // No Splash Damage
            this.options.disableCleave = true
            this.options.ensureEquipped.mainhand = { name: "fireblade", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.offhand = { name: "fireblade", filters: { returnHighestLevel: true } },
            delete this.options.enableEquipForCleave
            this.options.typeList = ["mrpumpkin"]
            delete this.options.enableGreedyAggro
        } else {
            // Splash Damage & additional monsters
            delete this.options.disableCleave
            this.options.ensureEquipped.mainhand = { name: "vhammer", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.offhand = { name: "ololipop", filters: { returnHighestLevel: true } },
            this.options.enableEquipForCleave = true
            this.options.typeList = NON_PVP_MONSTERS
            this.options.enableGreedyAggro = true
        }
    }
}

export function constructMrPumpkinSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    // const moveStrategy = new MoveInCircleMoveStrategy({
    //     // This is between the xscorpions and the minimushes
    //     center: { map: "halloween", x: -250, y: 725 },
    //     radius: 20,
    //     sides: 16
    // })
    const moveStrategy = new ImprovedMoveStrategy("mrpumpkin", { idlePosition: { map: "halloween", x: -250, y: 725 } })

    return {
        configs: [
            {
                id: "mrpumpkin_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageMrPumpkinAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            ensureEquipped: { ...MAGE_NORMAL }
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestMrPumpkinAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorMrPumpkinAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...WARRIOR_NORMAL }
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "mrpumpkin_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestMrPumpkinAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorMrPumpkinAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...WARRIOR_NORMAL }
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}

export function constructMrPumpkinHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("mrpumpkin")

    return {
        configs: [
            {
                id: "mrpumpkin_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, type: "mrpumpkin", hasTarget: true }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "mrpumpkin_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, type: "mrpumpkin", hasTarget: true }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "mrpumpkin_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, type: "mrpumpkin", hasTarget: true }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "mrpumpkin_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, type: "mrpumpkin", hasTarget: true }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "mrpumpkin_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, type: "mrpumpkin", hasTarget: true }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "mrpumpkin_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, disableCleave: true, type: "mrpumpkin", hasTarget: true }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}