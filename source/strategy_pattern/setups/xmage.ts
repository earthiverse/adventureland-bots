import { Entity, GetEntityFilters, IPosition, Mage, MonsterName, PingCompensatedCharacter, Priest, Tools, Warrior } from "alclient";
import { KiteMonsterMoveStrategy } from "../strategies/move.js";
import { Strategist, filterContexts } from "../context.js";
import { suppress_errors } from "../logging.js";
import { bankingPosition, getClosestBotToPosition } from "../../base/locations.js";
import { NodeData } from "alclient/build/definitions/pathfinder.js";
import { goAndWithdrawItem, locateItemsInBank } from "../../base/banking.js";
import { MageAttackStrategy, MageAttackStrategyOptions } from "../strategies/attack_mage.js";
import { PriestAttackStrategy, PriestAttackStrategyOptions } from "../strategies/attack_priest.js";
import { WarriorAttackStrategy, WarriorAttackStrategyOptions } from "../strategies/attack_warrior.js";
import { Setup } from "./base.js";

const XMAGE_MONSTERS: MonsterName[] = ["xmagefz", "xmagefi", "xmagen", "xmagex"]

class XMageMoveStrategy extends KiteMonsterMoveStrategy {
    public constructor(contexts: Strategist<PingCompensatedCharacter>[]) {
        super({
            contexts: contexts,
            typeList: XMAGE_MONSTERS
        })

        // Only include winter instance map positions
        this.spawns = this.spawns.filter(p => p.map === "winter_instance")
    }

    protected async move(bot: PingCompensatedCharacter): Promise<IPosition> {
        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }
        const friends = filterContexts(this.options.contexts, { serverData: bot.serverData }).map(e => e.bot)

        // Check if we have a field generator, or if there's one in our bank
        const fieldgenFilters: GetEntityFilters = { type: "fieldgen0" }
        let fieldGen: boolean | Entity = false
        for (const friend of friends) {
            if (friend.hasItem("fieldgen0")) {
                fieldGen = true
            }

            if (friend.map !== "winter_instance") continue
            const entity = friend.getEntity(fieldgenFilters)
            if (entity) {
                fieldGen = entity
                break
            }
        }

        if (typeof fieldGen === "boolean") {
            if (bot.hasItem("fieldgen0")) {
                if (bot.map === "winter_instance") {
                    // Place the fieldgen0
                    const fieldGen0 = bot.locateItem("fieldgen0")
                    await bot.equip(fieldGen0)
                } else {
                    // Move to xmage
                    super.move(bot)
                    return
                }
            } else {
                // Have the closeest bot get a fieldgen0 from the bank
                const closest = getClosestBotToPosition(bankingPosition as NodeData, friends)
                if (closest === bot) {
                    await bot.smartMove(bankingPosition)
                    const bankFieldgens = locateItemsInBank(bot, { name: "fieldgen0" })
                    if (bankFieldgens.length) {
                        const [packName, indexes] = bankFieldgens[0]
                        await goAndWithdrawItem(bot, packName, indexes[0])
                    }
                    return
                }

                // Wait for a fieldgen0 to be placed
                this.options.typeList = ["snowman", "arcticbee"]
                super.move(bot)
                return
            }
        }

        // Reset incase we were farming arctic bees
        this.options.typeList = XMAGE_MONSTERS

        // If priest, and the fieldgen needs healing, move within healing range
        if (bot.ctype === "priest" && typeof fieldGen !== "boolean" && fieldGen.hp < (fieldGen.max_hp * 0.75)) {
            if (!bot.moving && Tools.distance(bot, fieldGen))
                bot.smartMove(fieldGen, { getWithin: bot.range - 25 }).catch(suppress_errors)
            return
        }

        for (const type of XMAGE_MONSTERS) {
            filter.type = type as MonsterName

            // Check for the entity in all of the contexts
            let entity: Entity
            for (const context of filterContexts(this.options.contexts, { serverData: bot.serverData })) {
                const friend = context.bot
                if (friend.map !== bot.map) continue

                entity = friend.getEntity(filter)
                if (entity) break
            }
            if (!entity) continue

            this.kite(bot, entity).catch(suppress_errors)
            return
        }

        // Go find an xmage
        return super.move(bot)
    }
}

class MageXMageAttackStrategy extends MageAttackStrategy {
    public constructor(options?: MageAttackStrategyOptions) {
        super(options)

        this.options.generateEnsureEquipped = {
            attributes: ["resistance", "int"],
            ensure: {
                mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
                offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
                orb: { name: "jacko", filters: { returnHighestLevel: true } }
            }
        }
        this.options.maximumTargets = 0
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
            attributes: ["resistance", "int"],
            ensure: {
                mainhand: { name: "lmace", filters: { returnHighestLevel: true } },
                offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
                orb: { name: "jacko", filters: { returnHighestLevel: true } }
            }
        }
        this.options.enableAbsorbToTank = true
        this.options.typeList = XMAGE_MONSTERS
    }

    protected async attack(bot: Priest): Promise<void> {
        // If there's a fieldgen and it needs healing, heal it
        const fieldGen = bot.getEntity({ type: "fieldgen0", withinRange: "heal" })
        if (fieldGen && fieldGen.hp < (fieldGen.max_hp * 0.75)) {
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
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
        }

        return super.attack(bot)
    }
}

class WarriorXMageAttackStrategy extends WarriorAttackStrategy {
    public constructor(options?: WarriorAttackStrategyOptions) {
        super(options)

        this.options.generateEnsureEquipped = {
            attributes: ["resistance", "str"],
            ensure: {
                mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                offhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                orb: { name: "jacko", filters: { returnHighestLevel: true } }
            }
        }
        this.options.maximumTargets = 0
        this.options.typeList = XMAGE_MONSTERS
    }

    protected async attack(bot: Warrior): Promise<void> {
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
                            items: ["jacko", "test_orb"]
                        }
                    },
                    {
                        ctype: "priest",
                        attack: new PriestXMageAttackStrategy({
                            contexts: contexts,
                        }),
                        move: moveStrategy,
                        require: {
                            items: ["jacko", "test_orb"]
                        }
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorXMageAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                        }),
                        move: moveStrategy,
                        require: {
                            items: ["jacko", "test_orb"]
                        }
                    }
                ]
            }
        ]
    }
}
