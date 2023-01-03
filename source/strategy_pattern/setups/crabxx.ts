import { Mage, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR, WARRIOR_SPLASH } from "./equipment.js"

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
            this.options.typeList = ["crabxx"]
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
    const moveStrategy = new ImprovedMoveStrategy(["crabx", "crabxx"])

    return {
        configs: [
            {
                id: "crabxx_mage,priest,warrior",
                characters: [
                    // The mage will prioritize crabx so that the giga crab can take damage
                    {
                        ctype: "mage",
                        attack: new MageGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            disableEnergize: true,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    },
                    // The priest will tank the giga crab
                    {
                        ctype: "priest",
                        attack: new PriestGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            typeList: ["crabxx", "crabx"],
                        }),
                        move: new ImprovedMoveStrategy("crabxx")
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
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_ranger,priest,warrior",
                characters: [
                    // The ranger will prioritize crabx so that the giga crab can take damage
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            disableEnergize: true,
                            ensureEquipped: {
                                mainhand: { name: "crossbow", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    },
                    // The priest will tank the giga crab
                    {
                        ctype: "priest",
                        attack: new PriestGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            typeList: ["crabxx", "crabx"],
                        }),
                        move: new ImprovedMoveStrategy("crabxx")
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
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_priest,warrior",
                characters: [
                    // The priest will tank the giga crab
                    {
                        ctype: "priest",
                        attack: new PriestGigaCrabAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_ARMOR },
                            typeList: ["crabxx", "crabx"],
                        }),
                        move: new ImprovedMoveStrategy("crabxx")
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
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}


export function constructGigaCrabHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "crabxx_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, disableCreditCheck: true, typeList: ["crabx", "crabxx"] }),
                        move: new ImprovedMoveStrategy(["crabx", "crabxx"])
                    }
                ]
            },
            {
                id: "crabxx_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, disableCreditCheck: true, typeList: ["crabx", "crabxx"] }),
                        move: new ImprovedMoveStrategy(["crabx", "crabxx"])
                    }
                ]
            },
            {
                id: "crabxx_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, disableCreditCheck: true, enableHealStrangers: true, typeList: ["crabx", "crabxx"] }),
                        move: new ImprovedMoveStrategy(["crabx", "crabxx"])
                    }
                ]
            },
            {
                id: "crabxx_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, disableCreditCheck: true, typeList: ["crabx", "crabxx"] }),
                        move: new ImprovedMoveStrategy(["crabx", "crabxx"])
                    }
                ]
            },
            {
                id: "crabxx_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, disableCreditCheck: true, typeList: ["crabx", "crabxx"] }),
                        move: new ImprovedMoveStrategy(["crabx", "crabxx"])
                    }
                ]
            },
            {
                id: "crabxx_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, disableCleave: true, disableCreditCheck: true, enableEquipForStomp: true, typeList: ["crabx", "crabxx"] }),
                        move: new ImprovedMoveStrategy(["crabx", "crabxx"])
                    }
                ]
            }
        ]
    }
}