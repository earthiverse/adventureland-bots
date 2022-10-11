import { PingCompensatedCharacter, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_ARMOR } from "./equipment.js"

class WarriorMrGreenAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
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
        super.onApply(bot)
    }
}

export function constructMrGreenSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("mrgreen")

    return {
        configs: [
            {
                id: "mrgreen_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            ensureEquipped: {
                                mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
                                offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } },
                                ring1: { name: "zapper", filters: { returnHighestLevel: true } },
                                ring2: { name: "cring", filters: { returnHighestLevel: true } },
                            },
                            type: "mrgreen",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_ARMOR,
                            type: "mrgreen",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorMrGreenAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                offhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } },
                                ring1: { name: "zapper", filters: { returnHighestLevel: true } },
                            },
                            type: "mrgreen",
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "mrgreen_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_ARMOR,
                            type: "mrgreen",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                offhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } },
                            },
                            type: "mrgreen",
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}