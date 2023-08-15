import { Entity, GetEntityFilters, IPosition, Mage, MonsterName, PingCompensatedCharacter, Priest, Tools, Warrior } from "alclient";
import { SpecialMonsterMoveStrategy } from "../strategies/move.js";
import { Strategist, filterContexts } from "../context.js";
import { suppress_errors } from "../logging.js";
import { bankingPosition, getClosestBotToPosition, offsetPositionParty } from "../../base/locations.js";
import { NodeData } from "alclient/build/definitions/pathfinder.js";
import { goAndWithdrawItem, locateItemsInBank } from "../../base/banking.js";
import { MageAttackStrategy, MageAttackStrategyOptions } from "../strategies/attack_mage.js";
import { RETURN_HIGHEST } from "./equipment.js";
import { PriestAttackStrategy, PriestAttackStrategyOptions } from "../strategies/attack_priest.js";
import { WarriorAttackStrategy, WarriorAttackStrategyOptions } from "../strategies/attack_warrior.js";
import { Setup } from "./base.js";

const XMAGE_MONSTERS: MonsterName[] = ["xmagefz", "xmagefi", "xmagen", "xmagex"]
const CRYPT_ENTRANCE: IPosition = { x: 1064.28, y: -2017.79, map: "winterland" }

class XMageMoveStrategy extends SpecialMonsterMoveStrategy {
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
                break
            }

            if (friend.map !== "winter_instance") continue
            const entity = friend.getEntity(fieldgenFilters)
            if (entity) {
                fieldGen = entity
                break
            }
        }

        if (!fieldGen) {
            // Have the closest bot to the bank go and grab one
            const closest = getClosestBotToPosition(bankingPosition as NodeData, friends)
            if (closest === bot) {
                await bot.smartMove(bankingPosition)
                const bankFieldgens = locateItemsInBank(bot, { name: "fieldgen0" })
                if (bankFieldgens.length) {
                    const [packName, indexes] = bankFieldgens[0]
                    await goAndWithdrawItem(bot, packName, indexes[0])
                }
                return
            } else {
                // Have the rest farm arctic bees until we get a field gen
                // TODO: Improve this a bit
                if (!bot.smartMoving) {
                    bot.smartMove("arcticbee").catch(suppress_errors)
                }
                return
            }
        }

        // If priest, and the fieldgen needs healing, move within healing range
        if (bot.ctype === "priest" && typeof fieldGen !== "boolean" && fieldGen.hp < (fieldGen.max_hp * 0.75)) {
            if (!bot.moving && Tools.distance(bot, fieldGen))
                bot.smartMove(fieldGen, { getWithin: bot.range - 25 }).catch(suppress_errors)
            return
        }

        // TODO: Place Field gen if we have one and it's time to use it

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

            bot.smartMove(offsetPositionParty(entity, bot)).catch(suppress_errors)
            return
        }

        // Go find an xmage
        return super.move(bot)
    }
}

class MageXMageAttackStrategy extends MageAttackStrategy {
    public constructor(options?: MageAttackStrategyOptions) {
        super(options)

        this.options.typeList = XMAGE_MONSTERS

        // TODO: Choose best equipment
        this.options.ensureEquipped = {
            amulet: { name: "intamulet", filters: RETURN_HIGHEST },
            belt: { name: "intbelt", filters: RETURN_HIGHEST },
            cape: { name: "tigercape", filters: RETURN_HIGHEST },
            chest: { name: "harmor", filters: RETURN_HIGHEST },
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
            gloves: { name: "hgloves", filters: RETURN_HIGHEST },
            helmet: { name: "hhelmet", filters: RETURN_HIGHEST },
            mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            offhand: { name: "wbookhs", filters: RETURN_HIGHEST },
            orb: { name: "jacko", filters: RETURN_HIGHEST },
            pants: { name: "hpants", filters: RETURN_HIGHEST },
            ring1: { name: "cring", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
            shoes: { name: "vboots", filters: RETURN_HIGHEST },
        }
    }

    protected async attack(bot: Mage): Promise<void> {
        const entity = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (!entity) return super.attack(bot)

        // TODO: Choose equipment based on what we're fighting
        switch (entity.type) {
            case "xmagefi":
                break
            case "xmagefz":
                break
            case "xmagen":
                break
            case "xmagex":
                break
        }

        return super.attack(bot)
    }
}

class PriestXMageAttackStrategy extends PriestAttackStrategy {
    public constructor(options?: PriestAttackStrategyOptions) {
        super(options)

        this.options.typeList = XMAGE_MONSTERS

        // TODO: Choose best equipment
        this.options.ensureEquipped = {
            amulet: { name: "intamulet", filters: RETURN_HIGHEST },
            belt: { name: "intbelt", filters: RETURN_HIGHEST },
            cape: { name: "angelwings", filters: RETURN_HIGHEST },
            chest: { name: "harmor", filters: RETURN_HIGHEST },
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
            gloves: { name: "xgloves", filters: RETURN_HIGHEST },
            helmet: { name: "hhelmet", filters: RETURN_HIGHEST },
            mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            offhand: { name: "tigershield", filters: RETURN_HIGHEST },
            orb: { name: "jacko", filters: RETURN_HIGHEST },
            pants: { name: "hpants", filters: RETURN_HIGHEST },
            ring1: { name: "cring", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
            shoes: { name: "hboots", filters: RETURN_HIGHEST },
        }
    }

    protected async attack(bot: Priest): Promise<void> {
        // If there's a fieldgen and it needs healing, heal it
        const fieldGen = bot.getEntity({ type: "fieldgen0", withinRange: "heal" })
        if (fieldGen && fieldGen.hp < (fieldGen.max_hp * 0.75)) {
            await bot.healSkill(fieldGen.id)
        }

        const entity = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (!entity) return super.attack(bot)

        // TODO: Choose equipment based on what we're fighting
        switch (entity.type) {
            case "xmagefi":
                break
            case "xmagefz":
                break
            case "xmagen":
                break
            case "xmagex":
                break
        }

        return super.attack(bot)
    }
}

class WarriorXMageAttackStrategy extends WarriorAttackStrategy {
    public constructor(options?: WarriorAttackStrategyOptions) {
        super(options)

        this.options.typeList = XMAGE_MONSTERS

        // TODO: Choose best equipment
        this.options.ensureEquipped = {
            amulet: { name: "snring", filters: RETURN_HIGHEST },
            belt: { name: "strbelt", filters: RETURN_HIGHEST },
            cape: { name: "bcape", filters: RETURN_HIGHEST },
            chest: { name: "xarmor", filters: RETURN_HIGHEST },
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
            gloves: { name: "xgloves", filters: RETURN_HIGHEST },
            helmet: { name: "xhelmet", filters: RETURN_HIGHEST },
            mainhand: { name: "vhammer", filters: RETURN_HIGHEST },
            offhand: { name: "ololipop", filters: RETURN_HIGHEST },
            pants: { name: "xpants", filters: RETURN_HIGHEST },
            ring1: { name: "strring", filters: RETURN_HIGHEST },
            ring2: { name: "strring", filters: RETURN_HIGHEST },
            shoes: { name: "vboots", filters: RETURN_HIGHEST },
        }
    }

    protected async attack(bot: Warrior): Promise<void> {
        const entity = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (!entity) return super.attack(bot)

        // TODO: Choose equipment based on what we're fighting
        switch (entity.type) {
            case "xmagefi":
                break
            case "xmagefz":
                break
            case "xmagen":
                break
            case "xmagex":
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
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestXMageAttackStrategy({
                            contexts: contexts,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorXMageAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}
