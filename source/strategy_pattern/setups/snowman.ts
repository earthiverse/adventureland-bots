import { Mage, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, PRIEST_ARMOR, PRIEST_FAST, WARRIOR_SPLASH } from "./equipment.js"

class MageSnowmanAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        if (bot.serverData.name === "PVP") {
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

class PriestSnowmanAttackStrategy extends PriestAttackStrategy {
    public onApply(bot: Priest): void {
        if (bot.serverData.name === "PVP") {
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

class WarriorSnowmanAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        if (bot.serverData.name === "PVP") {
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

export function constructSnowmanSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const snowmanMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["snowman"] })

    return {
        configs: [
            {
                id: "snowman_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageSnowmanAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: ["snowman", "arcticbee"]
                        }),
                        move: snowmanMoveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestSnowmanAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...PRIEST_FAST },
                            typeList: ["snowman", "arcticbee"],
                        }),
                        move: snowmanMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorSnowmanAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: ["snowman", "arcticbee"]
                        }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestSnowmanAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            ensureEquipped: { ...PRIEST_FAST },
                            typeList: ["snowman", "arcticbee"],
                        }),
                        move: snowmanMoveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorSnowmanAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: ["snowman", "arcticbee"]
                        }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
        ]
    }
}

export function constructSnowmanHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const snowmanMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["snowman"] })

    return {
        configs: [
            {
                id: "snowman_helper_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: ["snowman", "arcticbee"] }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: ["snowman", "arcticbee"] }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, disableAbsorb: true, typeList: ["snowman", "arcticbee"] }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: ["snowman", "arcticbee"] }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: ["snowman", "arcticbee"] }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, disableAgitate: true, typeList: ["snowman", "arcticbee"] }),
                        move: snowmanMoveStrategy
                    }
                ]
            }
        ]
    }
}