import { PingCompensatedCharacter, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_ARMOR, PRIEST_ARMOR, WARRIOR_NORMAL } from "./equipment.js"

class WarriorIceGolemAttackStrategy extends WarriorAttackStrategy {
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

export function constructIceGolemSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("icegolem")

    return {
        configs: [
            {
                id: "icegolem_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            ensureEquipped: { ...MAGE_ARMOR },
                            type: "icegolem",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            type: "icegolem",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorIceGolemAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            ensureEquipped: { ...WARRIOR_NORMAL },
                            type: "icegolem",
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "icegolem_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            type: "icegolem",
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorIceGolemAttackStrategy({
                            contexts: contexts,
                            disableCleave: true,
                            ensureEquipped: { ...WARRIOR_NORMAL },
                            type: "icegolem",
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}

export function constructIceGolemHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "icegolem_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, type: "icegolem", hasTarget: true }),
                        move: new ImprovedMoveStrategy("icegolem")
                    }
                ]
            },
            {
                id: "icegolem_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, type: "icegolem", hasTarget: true }),
                        move: new ImprovedMoveStrategy("icegolem")
                    }
                ]
            },
            {
                id: "icegolem_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, type: "icegolem", hasTarget: true }),
                        move: new ImprovedMoveStrategy("icegolem")
                    }
                ]
            },
            {
                id: "icegolem_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, type: "icegolem", hasTarget: true }),
                        move: new ImprovedMoveStrategy("icegolem")
                    }
                ]
            },
            {
                id: "icegolem_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, type: "icegolem", hasTarget: true }),
                        move: new ImprovedMoveStrategy("icegolem")
                    }
                ]
            },
            {
                id: "icegolem_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, disableCleave: true, type: "icegolem", hasTarget: true }),
                        move: new ImprovedMoveStrategy("icegolem")
                    }
                ]
            }
        ]
    }
}