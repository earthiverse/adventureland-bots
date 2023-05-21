import { Mage, MonsterName, PingCompensatedCharacter, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_LUCK, WARRIOR_SPLASH } from "./equipment.js"

class MageRGooAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        super.onApply(bot)
        if (bot.serverData.name === "PVP") {
            // No splash damage
            this.options.ensureEquipped.mainhand = { name: "firestaff", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "wbookhs", filters: { returnHighestLevel: true } }
            delete this.options.enableGreedyAggro
        } else {
            // Splash damage & additional monsters
            this.options.ensureEquipped.mainhand = { name: "gstaff", filters: { returnHighestLevel: true } }
            delete this.options.ensureEquipped.offhand
            this.options.enableGreedyAggro = true
        }
    }
}

class WarriorRGooAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        super.onApply(bot)
        if (bot.serverData.name === "PVP") {
            // No Splash Damage
            this.options.disableCleave = true
            this.options.ensureEquipped.mainhand = { name: "fireblade", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.offhand = { name: "fireblade", filters: { returnHighestLevel: true } },
            delete this.options.enableEquipForCleave
        } else {
            // Splash Damage & additional monsters
            delete this.options.disableCleave
            this.options.ensureEquipped.mainhand = { name: "vhammer", filters: { returnHighestLevel: true } },
            this.options.ensureEquipped.offhand = { name: "ololipop", filters: { returnHighestLevel: true } },
            this.options.enableEquipForCleave = true
        }
    }
}

export function constructRGooSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const goos: MonsterName[] = ["rgoo", "bgoo"]
    const moveStrategy = new ImprovedMoveStrategy(goos, { idlePosition: { map: "goobrawl", x: 0, y: 0 } })

    return {
        configs: [
            {
                id: "rgoo_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageRGooAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: goos
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            enableHealStrangers: true,
                            ensureEquipped: { ...PRIEST_LUCK },
                            typeList: goos
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorRGooAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: goos
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}

export function constructRGooHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const goos: MonsterName[] = ["rgoo", "bgoo"]
    const moveStrategy = new ImprovedMoveStrategy(goos, { idlePosition: { map: "goobrawl", x: 0, y: 0 } })

    return {
        configs: [
            {
                id: "rgoo_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: goos }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "rgoo_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: goos }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "rgoo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, typeList: goos }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "rgoo_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: goos }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "rgoo_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: goos }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "rgoo_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, typeList: goos }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}