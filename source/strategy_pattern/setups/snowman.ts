import { Mage, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"

class MageSnowmanAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        super.onApply(bot)
        if (bot.isPVP()) {
            // No splash damage
            this.options.ensureEquipped.mainhand = { name: "firestaff", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "wbookhs", filters: { returnHighestLevel: true } }
        } else {
            // Splash damage & additional monsters
            this.options.ensureEquipped.mainhand = { name: "gstaff", filters: { returnHighestLevel: true } }
            delete this.options.ensureEquipped.offhand
        }
    }
}

class PriestSnowmanAttackStrategy extends PriestAttackStrategy {
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

class WarriorSnowmanAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        super.onApply(bot)
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
    }
}

export function constructSnowmanSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const snowmanMoveStrategy = new SpecialMonsterMoveStrategy({ contexts: contexts, typeList: ["snowman"] })

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageSnowmanAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["blast", "explosion", "frequency"]
            },
            typeList: ["snowman", "arcticbee"]
        }),
        move: snowmanMoveStrategy
    }
    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestSnowmanAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["frequency"]
            },
            typeList: ["snowman", "arcticbee"],
        }),
        move: snowmanMoveStrategy
    }
    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorSnowmanAttackStrategy({
            contexts: contexts,
            enableEquipForCleave: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["blast", "explosion", "frequency"]
            },
            typeList: ["snowman", "arcticbee"]
        }),
        move: snowmanMoveStrategy
    }

    return {
        configs: [
            {
                id: "snowman_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig]
            },
            {
                id: "snowman_priest,warrior",
                characters: [priestConfig, warriorConfig]
            },
            {
                id: "snowman_mage",
                characters: [mageConfig]
            },
            {
                id: "snowman_priest",
                characters: [priestConfig]
            },
            {
                id: "snowman_warrior",
                characters: [warriorConfig]
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
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["frequency"] },
                            typeList: ["snowman", "arcticbee"]
                        }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["frequency"] },
                            typeList: ["snowman", "arcticbee"]
                        }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["frequency"] },
                            disableAbsorb: true,
                            typeList: ["snowman", "arcticbee"]
                        }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["frequency"] },
                            typeList: ["snowman", "arcticbee"]
                        }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["frequency"] },
                            typeList: ["snowman", "arcticbee"]
                        }),
                        move: snowmanMoveStrategy
                    }
                ]
            },
            {
                id: "snowman_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["frequency"] },
                            disableAgitate: true,
                            typeList: ["snowman", "arcticbee"]
                        }),
                        move: snowmanMoveStrategy
                    }
                ]
            }
        ]
    }
}