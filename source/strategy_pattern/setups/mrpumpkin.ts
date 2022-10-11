import { Mage, MonsterName, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy, } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_ARMOR } from "./equipment.js"

const NON_PVP_MONSTERS: MonsterName[] = ["mrpumpkin", "phoenix", "xscorpion", "minimush", "tinyp"]

class MageMrPumpkinAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        if (bot.isPVP()) {
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
        super.onApply(bot)
    }
}

class PriestMrPumpkinAttackStrategy extends PriestAttackStrategy {
    public onApply(bot: Priest): void {
        if (bot.isPVP()) {
            this.options.ensureEquipped.orb = { name: "jacko", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.ring1 = { name: "cring", filters: { returnHighestLevel: true } }
            this.options.typeList = ["mrpumpkin"]
        } else {
            // Additional monsters
            this.options.ensureEquipped.orb = { name: "jacko", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.ring1 = { name: "zapper", filters: { returnHighestLevel: true } }
            this.options.typeList = NON_PVP_MONSTERS
        }
        super.onApply(bot)
    }
}

class WarriorMrPumpkinAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        if (bot.isPVP()) {
            // No Splash Damage
            this.options.disableCleave = true
            this.options.ensureEquipped.mainhand = { name: "fireblade", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.offhand = { name: "fireblade", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.ring1 = { name: "strring", filters: { returnHighestLevel: true } },
            delete this.options.enableEquipForCleave
            this.options.typeList = ["mrpumpkin"]
            delete this.options.enableGreedyAggro
        } else {
            // Splash Damage & additional monsters
            delete this.options.disableCleave
            this.options.ensureEquipped.mainhand = { name: "vhammer", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.offhand = { name: "ololipop", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.ring1 = { name: "zapper", filters: { returnHighestLevel: true } }
            this.options.enableEquipForCleave = true
            this.options.typeList = NON_PVP_MONSTERS
            this.options.enableGreedyAggro = true
        }
        super.onApply(bot)
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
                            ensureEquipped: {
                                orb: { name: "jacko", filters: { returnHighestLevel: true } },
                                ring1: { name: "zapper", filters: { returnHighestLevel: true } },
                                ring2: { name: "cring", filters: { returnHighestLevel: true } }
                            }
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestMrPumpkinAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_ARMOR,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorMrPumpkinAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: {
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            }
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
                            ensureEquipped: PRIEST_ARMOR,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorMrPumpkinAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: {
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            }
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}