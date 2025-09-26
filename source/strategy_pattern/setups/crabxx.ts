import { Entity, Mage, MonsterName, PingCompensatedCharacter, Priest, Ranger, Warrior } from "alclient"
import { mainCrabXs } from "../../base/locations.js"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import {
    HoldPositionMoveStrategy,
    KiteInCircleMoveStrategy,
    SpreadOutImprovedMoveStrategy,
} from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { ZAPPER_CRING, ZAPPER_STRRING } from "./equipment.js"

const types: MonsterName[] = ["crabx", "crabxx"]

// TODO: Optimize PVP weapons
class MageGigaCrabAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        super.onApply(bot)
        if (bot.server.name === "PVP") {
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

    protected async zapperAttack(bot: Mage, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("zapperzap")) return
        if (this.options.disableZapper) return

        await super.zapperAttack(bot, priority)

        const crabxx = bot.getEntity({ type: "crabxx" })
        if (!crabxx || crabxx["1hp"]) return // crabxx is not vulnerable

        if (bot.canUse("zapperzap") && bot.mp > bot.G.skills.zapperzap.mp + bot.mp_cost * 2)
            return bot.zapperZap(crabxx.id)
    }
}

class PriestGigaCrabAttackStrategy extends PriestAttackStrategy {
    public onApply(bot: Priest): void {
        super.onApply(bot)
        if (bot.server.name === "PVP") {
            this.options.ensureEquipped.ring1 = { name: "cring", filters: { returnHighestLevel: true } }
        } else {
            // Additional monsters
            this.options.ensureEquipped.ring1 = { name: "zapper", filters: { returnHighestLevel: true } }
        }
    }

    protected async zapperAttack(bot: Priest, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("zapperzap")) return
        if (this.options.disableZapper) return

        await super.zapperAttack(bot, priority)

        const crabxx = bot.getEntity({ type: "crabxx" })
        if (!crabxx || crabxx["1hp"]) return // crabxx is not vulnerable

        if (bot.canUse("zapperzap") && bot.mp > bot.G.skills.zapperzap.mp + bot.mp_cost * 2)
            return bot.zapperZap(crabxx.id)
    }
}

class WarriorGigaCrabAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        super.onApply(bot)
        if (bot.server.name === "PVP") {
            // No Splash Damage
            this.options.disableCleave = true
            this.options.disableStomp = true
            this.options.ensureEquipped.mainhand = { name: "fireblade", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "fireblade", filters: { returnHighestLevel: true } }
            delete this.options.enableEquipForCleave
            delete this.options.enableEquipForStomp
        } else {
            // Splash Damage
            delete this.options.disableCleave
            delete this.options.disableStomp
            this.options.ensureEquipped.mainhand = { name: "vhammer", filters: { returnHighestLevel: true } }
            this.options.ensureEquipped.offhand = { name: "ololipop", filters: { returnHighestLevel: true } }
            this.options.enableEquipForCleave = true
            this.options.enableEquipForStomp = true
        }
    }

    protected async zapperAttack(bot: Warrior, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("zapperzap")) return
        if (this.options.disableZapper) return

        await super.zapperAttack(bot, priority)

        const crabxx = bot.getEntity({ type: "crabxx" })
        if (!crabxx || crabxx["1hp"]) return // crabxx is not vulnerable

        if (bot.canUse("zapperzap") && bot.mp > bot.G.skills.zapperzap.mp + bot.mp_cost * 2)
            return bot.zapperZap(crabxx.id)
    }
}

class RangerGigaCrabAttackStrategy extends RangerAttackStrategy {
    protected async zapperAttack(bot: Ranger, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("zapperzap")) return
        if (this.options.disableZapper) return

        await super.zapperAttack(bot, priority)

        const crabxx = bot.getEntity({ type: "crabxx" })
        if (!crabxx || crabxx["1hp"]) return // crabxx is not vulnerable

        if (bot.canUse("zapperzap") && bot.mp > bot.G.skills.zapperzap.mp + bot.mp_cost * 2)
            return bot.zapperZap(crabxx.id)
    }
}

export function constructGigaCrabSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const kiteStrategy = new KiteInCircleMoveStrategy({ center: mainCrabXs, type: "crabxx", radius: 150 })
    const spreadOutMoveStrategy = new SpreadOutImprovedMoveStrategy(types)
    const holdMoveStrategy = new HoldPositionMoveStrategy(mainCrabXs)

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageGigaCrabAttackStrategy({
            contexts: contexts,
            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "blast", "explosion"],
                prefer: {
                    amulet: { name: "mpxamulet", filters: { returnHighestLevel: true } },
                    gloves: { name: "mpxgloves", filters: { returnHighestLevel: true } },
                    orb: { name: "jacko", filters: { returnHighestLevel: true } },
                },
            },
            typeList: types,
        }),
        move: spreadOutMoveStrategy,
    }

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestGigaCrabAttackStrategy({
            contexts: contexts,
            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
            disableEnergize: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["armor", "attack", "int"],
                prefer: {
                    amulet: { name: "mpxamulet", filters: { returnHighestLevel: true } },
                    gloves: { name: "mpxgloves", filters: { returnHighestLevel: true } },
                    orb: { name: "jacko", filters: { returnHighestLevel: true } },
                },
            },
            typeList: types,
        }),
        move: spreadOutMoveStrategy,
    }
    const priestTankConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableCreditCheck: true,
            enableAbsorbToTank: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["armor", "attack", "int"],
                prefer: {
                    ...ZAPPER_CRING,
                    amulet: { name: "mpxamulet", filters: { returnHighestLevel: true } },
                    gloves: { name: "mpxgloves", filters: { returnHighestLevel: true } },
                    orb: { name: "jacko", filters: { returnHighestLevel: true } },
                },
            },
            typeList: ["crabxx"],
        }),
        move: kiteStrategy,
    }

    // The warrior will prioritize crabx so that the giga crab can take damage
    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorGigaCrabAttackStrategy({
            contexts: contexts,
            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
            enableEquipForCleave: true,
            enableEquipForStomp: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["armor", "str", "blast", "explosion"],
                prefer: {
                    ...ZAPPER_STRRING,
                    amulet: { name: "mpxamulet", filters: { returnHighestLevel: true } },
                    gloves: { name: "mpxgloves", filters: { returnHighestLevel: true } },
                    orb: { name: "jacko", filters: { returnHighestLevel: true } },
                },
            },
            typeList: types,
        }),
        move: holdMoveStrategy,
    }

    const rangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerGigaCrabAttackStrategy({
            contexts: contexts,
            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
            disableEnergize: true,
            generateEnsureEquipped: {
                prefer: {
                    ...ZAPPER_CRING,
                    amulet: { name: "mpxamulet", filters: { returnHighestLevel: true } },
                    gloves: { name: "mpxgloves", filters: { returnHighestLevel: true } },
                    mainhand: { name: "crossbow", filters: { returnHighestLevel: true } },
                    orb: { name: "vorb", filters: { returnHighestLevel: true } },
                },
            },
            typeList: types,
        }),
        move: spreadOutMoveStrategy,
        require: {
            items: ["jacko"],
        },
    }

    return {
        configs: [
            {
                id: "crabxx_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "crabxx_ranger,priest,warrior",
                characters: [rangerConfig, priestConfig, warriorConfig],
            },
            {
                id: "crabxx_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
            {
                id: "crabxx_priest(tank),ranger",
                characters: [priestTankConfig, rangerConfig],
            },
        ],
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
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
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
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
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
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
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
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
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
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
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
                            typeList: types,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
