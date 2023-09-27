import { Mage, MonsterName, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpreadOutImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

const types: MonsterName[] = ["crabx", "crabxx"]

// TODO: Optimize PVP weapons
class MageGigaCrabAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        super.onApply(bot)
        if (bot.isPVP()) {
            // No splash damage
            this.options.ensureEquipped.mainhand = { name: "firestaff", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "wbookhs", filters: { returnHighestLevel: true } }
            delete this.options.enableGreedyAggro
        } else {
            // Splash damage
            this.options.ensureEquipped.mainhand = { name: "gstaff", filters: { returnHighestLevel: true } }
            delete this.options.ensureEquipped.offhand
            this.options.enableGreedyAggro = true
        }
    }
}

class PriestGigaCrabAttackStrategy extends PriestAttackStrategy {
    public onApply(bot: Priest): void {
        super.onApply(bot)
        if (bot.isPVP()) {
            this.options.ensureEquipped.orb = { name: "jacko", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.ring1 = { name: "cring", filters: { returnHighestLevel: true } }
        } else {
            // Additional monsters
            this.options.ensureEquipped.orb = { name: "jacko", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.ring1 = { name: "zapper", filters: { returnHighestLevel: true } }
        }
    }
}

class WarriorGigaCrabAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        super.onApply(bot)
        if (bot.isPVP()) {
            // No Splash Damage
            this.options.disableCleave = true
            this.options.ensureEquipped.mainhand = { name: "fireblade", filters: { returnHighestLevel: true } },
                this.options.ensureEquipped.offhand = { name: "fireblade", filters: { returnHighestLevel: true } },
                delete this.options.enableEquipForCleave
        } else {
            // Splash Damage
            delete this.options.disableCleave
            this.options.ensureEquipped.mainhand = { name: "vhammer", filters: { returnHighestLevel: true } },
                this.options.ensureEquipped.offhand = { name: "ololipop", filters: { returnHighestLevel: true } },
                this.options.enableEquipForCleave = true
        }
    }
}

export function constructGigaCrabSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpreadOutImprovedMoveStrategy(types)

    return {
        configs: [
            {
                id: "crabxx_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "blast", "explosion"]
                            },
                            typeList: types
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "attack", "int"]
                            },
                            typeList: types,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "blast", "explosion"]
                            },
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_ranger,priest,warrior",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "blast", "explosion"],
                                ensure: {
                                    mainhand: { name: "crossbow", filters: { returnHighestLevel: true } },
                                    orb: { name: "jacko", filters: { returnHighestLevel: true } }
                                }
                            },
                            typeList: types
                        }),
                        move: moveStrategy,
                        require: {
                            items: ["crossbow", "jacko"]
                        }
                    },
                    {
                        ctype: "priest",
                        attack: new PriestGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"]
                            },
                            typeList: types,
                        }),
                        move: moveStrategy
                    },
                    // The warrior will prioritize crabx so that the giga crab can take damage
                    {
                        ctype: "warrior",
                        attack: new WarriorGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "blast", "explosion"]
                            },
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "int", "attack"]
                            },
                            typeList: types,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            enableGreedyAggro: true,
                            generateEnsureEquipped: {
                                attributes: ["armor", "str", "blast", "explosion"]
                            },
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}

export function constructGigaCrabHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new SpreadOutImprovedMoveStrategy(types)

    return {
        configs: [
            {
                id: "crabxx_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true,
                            hasTarget: true,
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true,
                            hasTarget: true,
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableAbsorb: true,
                            disableCreditCheck: true,
                            enableHealStrangers: true,
                            hasTarget: true,
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true,
                            hasTarget: true,
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true,
                            hasTarget: true,
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            disableCreditCheck: true,
                            enableEquipForStomp: true,
                            hasTarget: true,
                            typeList: types
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}