import { Mage, MonsterName, PingCompensatedCharacter, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

const typeList: MonsterName[] = ["grinch"]

class MageGrinchAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        super.onApply(bot)
        if (bot.isPVP()) {
            // No splash damage
            this.options.ensureEquipped.mainhand = { name: "firestaff", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "wbookhs", filters: { returnHighestLevel: true } }
        } else {
            // Splash damage
            this.options.ensureEquipped.mainhand = { name: "gstaff", filters: { returnHighestLevel: true } }
            delete this.options.ensureEquipped.offhand
        }
    }
}

class WarriorGrinchAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        super.onApply(bot)
        if (bot.isPVP()) {
            // No Splash Damage
            this.options.disableCleave = true
            this.options.ensureEquipped.mainhand = { name: "fireblade", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "fireblade", filters: { returnHighestLevel: true } }
            delete this.options.enableEquipForStomp
            delete this.options.enableEquipForCleave
        } else {
            // Splash Damage
            delete this.options.disableCleave
            this.options.ensureEquipped.mainhand = { name: "vhammer", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "ololipop", filters: { returnHighestLevel: true } }
            this.options.enableEquipForStomp = true
            this.options.enableEquipForCleave = true
        }
    }
}

export function constructGrinchSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const grinchMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, ignoreMaps: ["bank", "bank_b", "bank_u", "hut", "woffice"], typeList: typeList })

    return {
        configs: [
            {
                id: "grinch_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageGrinchAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList
                        }),
                        move: grinchMoveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                        }),
                        move: grinchMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorGrinchAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                        }),
                        move: grinchMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorGrinchAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
        ]
    }
}

export function constructGrinchHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const grinchMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, ignoreMaps: ["bank", "bank_b", "bank_u", "hut", "woffice"], typeList: typeList })

    return {
        configs: [
            {
                id: "grinch_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableAbsorb: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            generateEnsureEquipped: { attributes: ["luck"] },
                            typeList: typeList,
                            hasTarget: true
                        }),
                        move: grinchMoveStrategy
                    }
                ]
            }
        ]
    }
}