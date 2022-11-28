import { Mage, MonsterName, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_LUCK } from "./equipment.js"

class MageGrinchAttackStrategy extends MageAttackStrategy {
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

class PriestGrinchAttackStrategy extends PriestAttackStrategy {
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

class WarriorGrinchAttackStrategy extends WarriorAttackStrategy {
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

const grinchMoveStrategy = new SpecialMonsterMoveStrategy({ type: "grinch" })
const typeList: MonsterName[] = ["grinch", "arcticbee", "bee", "crab", "crabx", "croc", "goo", "minimush", "osnake", "poisio", "scorpion", "snake", "spider"]

export function constructGrinchSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
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
                            ensureEquipped: {
                                mainhand: { name: "gstaff", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: typeList
                        }),
                        move: grinchMoveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestGrinchAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_LUCK },
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
                            ensureEquipped: {
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
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
                        attack: new PriestGrinchAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_LUCK },
                            typeList: typeList,
                        }),
                        move: grinchMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorGrinchAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "bataxe", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
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
    return {
        configs: [
            {
                id: "grinch_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: typeList, hasTarget: true }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: typeList, hasTarget: true }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, typeList: typeList, hasTarget: true }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: typeList, hasTarget: true }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: typeList, hasTarget: true }),
                        move: grinchMoveStrategy
                    }
                ]
            },
            {
                id: "grinch_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, enableEquipForCleave: true, enableEquipForStomp: true, typeList: typeList, hasTarget: true }),
                        move: grinchMoveStrategy
                    }
                ]
            }
        ]
    }
}