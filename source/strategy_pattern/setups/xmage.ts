import { IPosition, Mage, MonsterName, PingCompensatedCharacter, Priest, Tools, Warrior } from "alclient"
import { KiteMonsterMoveStrategy } from "../strategies/move.js"
import { Strategist, filterContexts } from "../context.js"
import { offsetPositionParty } from "../../base/locations.js"
import { MageAttackStrategy, MageAttackStrategyOptions } from "../strategies/attack_mage.js"
import { PriestAttackStrategy, PriestAttackStrategyOptions } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy, WarriorAttackStrategyOptions } from "../strategies/attack_warrior.js"
import { Setup } from "./base.js"
import { sleep } from "../../base/general.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { generateEnsureEquipped } from "./equipment.js"

export const XMAGE_MONSTERS: MonsterName[] = ["xmagex", "xmagen", "xmagefi", "xmagefz"]
export const DOWNTIME_MONSTERS: MonsterName[] = ["snowman", "arcticbee"]

class XMageMoveStrategy extends KiteMonsterMoveStrategy {
    public static activeBots = new Map<string, PingCompensatedCharacter>()

    public constructor(contexts: Strategist<PingCompensatedCharacter>[], disableCheckDB?: true) {
        super({
            contexts: contexts,
            disableCheckDB: disableCheckDB,
            typeList: XMAGE_MONSTERS,
        })

        // Only include winter instance or winterland positions
        this.spawns = this.spawns.filter((p) => p.map === "winter_instance" || p.map === "winterland")
    }

    public onApply(bot: PingCompensatedCharacter) {
        XMageMoveStrategy.activeBots.set(bot.id, bot)
    }

    public onRemove?(bot: PingCompensatedCharacter) {
        XMageMoveStrategy.activeBots.delete(bot.id)
    }

    protected async move(bot: PingCompensatedCharacter): Promise<IPosition> {
        const xmage = await this.checkGoodData(bot, true)

        if (xmage) {
            if (
                xmage.type === "xmagefi"
                && (
                    bot.ctype === "mage"
                    || this.options.disableCheckDB // We set this on our helpers, don't have helpers attack xmagefi
                )
            ) {
                // Priest can't keep up with healing too many characters, so have the mage go to arctic bees
                const arcticBee = bot.getEntity({ type: "arcticbee" })
                if (!arcticBee) {
                    await bot.smartMove("arcticbee", { resolveOnFinalMoveStart: true })
                } else if (Tools.distance(bot, arcticBee) > bot.range) {
                    await bot.smartMove(arcticBee, { getWithin: bot.range, resolveOnFinalMoveStart: true })
                }
                return
            }

            let nearbyMage = bot.getEntity({ typeList: XMAGE_MONSTERS })
            if (!nearbyMage) {
                await bot.smartMove(xmage, { getWithin: 800 })
            }

            nearbyMage = bot.getEntity({ typeList: XMAGE_MONSTERS })
            if (!nearbyMage) return // We still can't see it?

            if (nearbyMage.type === "xmagex") {
                if (bot.ctype === "priest") {
                    // Priest should go to xmage
                    await bot.smartMove(offsetPositionParty(xmage, bot, 20))
                } else {
                    // Other bots should kite
                    await this.kite(bot, nearbyMage)
                    return
                }
            } else {
                // Surround other mages
                await bot.smartMove(offsetPositionParty(xmage, bot, 20))
            }

            return
        } else if (this.options.disableCheckDB) {
            // Have other bots farm the downtime monsters
            this.options.typeList = DOWNTIME_MONSTERS
        }
        return super.move(bot)
    }
}

class MageXMageAttackStrategy extends MageAttackStrategy {
    public constructor(options?: MageAttackStrategyOptions) {
        super(options)

        this.options.generateEnsureEquipped = {
            attributes: ["resistance"],
            prefer: {
                mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
                offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
                orb: { name: "jacko", filters: { returnHighestLevel: true } },
            },
        }
        this.options.targetingPartyMember = true
        this.options.typeList = XMAGE_MONSTERS
    }

    protected async attack(bot: Mage): Promise<void> {
        const entity = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (!entity) return super.attack(bot)

        switch (entity.type) {
            case "xmagefi":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagefz":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagen":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
            case "xmagex":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
        }

        return super.attack(bot)
    }
}

class PriestXMageAttackStrategy extends PriestAttackStrategy {
    public constructor(options?: PriestAttackStrategyOptions) {
        super(options)

        this.options.generateEnsureEquipped = {
            attributes: ["resistance"],
            prefer: {
                mainhand: { name: "lmace", filters: { returnHighestLevel: true } },
                offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
                orb: { name: "jacko", filters: { returnHighestLevel: true } },
            },
        }
        this.options.enableAbsorbToTank = true
        this.options.typeList = XMAGE_MONSTERS
    }

    protected async attack(bot: Priest): Promise<void> {
        // If there's a fieldgen and it needs healing, heal it
        const fieldGen = bot.getEntity({ type: "fieldgen0", withinRange: "attack" })
        if (fieldGen && fieldGen.hp < fieldGen.max_hp * 0.75) {
            // Wait for heal if we need
            const healCooldown = bot.getCooldown("heal")
            if (healCooldown) await sleep(healCooldown)
            await bot.healSkill(fieldGen.id)
        }

        const entity = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (!entity) return super.attack(bot)

        switch (entity.type) {
            case "xmagefi":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagefz":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagen":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
            case "xmagex":
                if (entity.hp < 100_000) {
                    this.options.generateEnsureEquipped.prefer.orb.name = "rabbitsfoot"
                    this.options.generateEnsureEquipped.attributes = ["luck"]
                } else {
                    this.options.generateEnsureEquipped.prefer.orb.name = "jacko"
                    this.options.generateEnsureEquipped.attributes = ["resistance"]
                }
                this.options.ensureEquipped = generateEnsureEquipped(bot, this.options.generateEnsureEquipped)
                break
        }

        return super.attack(bot)
    }
}

class WarriorXMageAttackStrategy extends WarriorAttackStrategy {
    public constructor(options?: WarriorAttackStrategyOptions) {
        super(options)

        this.options.generateEnsureEquipped = {
            attributes: ["resistance"],
            prefer: {
                mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                offhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                orb: { name: "jacko", filters: { returnHighestLevel: true } },
                pants: { name: "xpants", filters: { returnHighestLevel: true } },
                shoes: { name: "vboots", filters: { returnHighestLevel: true } },
            },
        }
        this.options.targetingPartyMember = true
        this.options.typeList = XMAGE_MONSTERS
    }

    protected async attack(bot: Warrior): Promise<void> {
        const entity = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (!entity) return super.attack(bot)

        switch (entity.type) {
            case "xmagefi":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                if (await this.healPriestIfFrozen(bot)) return
                break
            case "xmagefz":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagen":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
            case "xmagex":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
        }

        return super.attack(bot)
    }

    protected async healPriestIfFrozen(bot: Warrior): Promise<boolean> {
        if (!bot.hasItem("cupid") && !bot.isEquipped("cupid")) return false // We don't have a cupid to heal
        if (bot.s.deepfreezed) return false // We are frozen

        const priests = filterContexts(this.options.contexts, { serverData: bot.serverData })
            .map((e) => e.bot)
            .filter((c) => c.in == bot.in && c.ctype == "priest")

        for (const priest of priests) {
            if (!priest.s.deepfreezed) continue
            if (priest.hp > priest.max_hp * 0.75) continue

            if (!bot.isEquipped("cupid")) {
                // Equip cupid
                if (bot.slots.offhand) await bot.unequip("offhand")
                await bot.equip(bot.locateItem("cupid"))
                await sleep(bot.s.penalty_cd.ms)
            }
            await bot.basicAttack(priest.id)
            return true
        }
        return false
    }
}

export function constructXMageSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new XMageMoveStrategy(contexts)

    return {
        configs: [
            {
                id: "xmage_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageXMageAttackStrategy({
                            contexts: contexts,
                        }),
                        move: moveStrategy,
                        require: {
                            items: ["jacko", "test_orb"],
                        },
                    },
                    {
                        ctype: "priest",
                        attack: new PriestXMageAttackStrategy({
                            contexts: contexts,
                        }),
                        move: moveStrategy,
                        require: {
                            items: ["jacko", "test_orb"],
                        },
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorXMageAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                        }),
                        move: moveStrategy,
                        require: {
                            items: ["jacko", "test_orb"],
                        },
                    },
                ],
            },
        ],
    }
}

/**
 * NOTE: These helpers aren't safe to use on xmagefi
 *
 * TODO: Are these helpers safe to use on xmagex?
 *
 * @param contexts
 * @returns
 */
export function constructXmageHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new XMageMoveStrategy(contexts, true)

    return {
        configs: [
            {
                id: "xmage_helper_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance"],
                            },
                            targetingPartyMember: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "xmage_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance"],
                            },
                            targetingPartyMember: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "xmage_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance"],
                            },
                            targetingPartyMember: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "xmage_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance"],
                            },
                            targetingPartyMember: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "xmage_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance"],
                                prefer: {
                                    // Stab for extra stacked damage
                                    mainhand: { name: "claw", filters: { returnHighestLevel: true } },
                                }
                            },
                            targetingPartyMember: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "xmage_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance"],
                            },
                            targetingPartyMember: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
