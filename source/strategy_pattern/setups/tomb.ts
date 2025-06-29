import { Character, Entity, GetEntityFilters, IPosition, MonsterName, PingCompensatedCharacter } from "alclient"
import { filterContexts, Strategist } from "../context.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { RETURN_HIGHEST } from "./equipment.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export const TOMB_MONSTERS: MonsterName[] = ["ggreenpro", "gredpro", "gbluepro", "gpurplepro"]

class TombMoveStrategy extends SpecialMonsterMoveStrategy {
    public constructor(contexts: Strategist<PingCompensatedCharacter>[]) {
        super({
            contexts: contexts,
            typeList: TOMB_MONSTERS,
        })

        // Only include crypt map positions
        this.spawns = this.spawns.filter((p) => p.map === "tomb")
    }

    protected move(bot: Character): Promise<IPosition> {
        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }

        let entity: Entity
        for (const type of TOMB_MONSTERS) {
            filter.type = type as MonsterName

            // Check for the entity in all of the contexts
            for (const context of filterContexts(this.options.contexts, { serverData: bot.serverData })) {
                const friend = context.bot
                if (friend.map !== bot.map) continue

                const newEntity = friend.getEntity(filter)
                if (!newEntity) continue
                if (!entity) entity = newEntity
                else if (!entity.target && newEntity.target) entity = newEntity // Prefer entities already with a target
            }
        }

        if (entity) return bot.smartMove(entity, { getWithin: bot.range / 2 })
        return super.move(bot) // Go find an entity
    }
}

export function constructTombSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new TombMoveStrategy(contexts)

    const rangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["armor", "resistance"],
                prefer: {
                    mainhand: { name: "firebow", filters: RETURN_HIGHEST },
                    offhand: { name: "t2quiver", filters: RETURN_HIGHEST },
                    orb: { name: "orba", filters: RETURN_HIGHEST },
                },
            },
            hasTarget: true,
            typeList: TOMB_MONSTERS,
        }),
        move: moveStrategy,
    }

    const rogueConfig: CharacterConfig = {
        ctype: "rogue",
        attack: new RogueAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["armor", "resistance"],
                prefer: {
                    mainhand: { name: "cclaw", filters: RETURN_HIGHEST },
                    offhand: { name: "firestars", filters: RETURN_HIGHEST },
                    gloves: { name: "mpxgloves", filters: RETURN_HIGHEST },
                    amulet: { name: "mpxamulet", filters: RETURN_HIGHEST },
                    orb: { name: "orba", filters: RETURN_HIGHEST },
                },
            },
            hasTarget: true,
            typeList: TOMB_MONSTERS,
        }),
        move: moveStrategy,
    }

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            enableAbsorbToTank: true,
            generateEnsureEquipped: {
                attributes: ["armor", "resistance"],
                prefer: {
                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                    orb: { name: "orba", filters: RETURN_HIGHEST },
                },
            },
            typeList: TOMB_MONSTERS,
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "tomb_rogue,rogue,priest",
                characters: [rogueConfig, rogueConfig, priestConfig],
            },
            {
                id: "tomb_rogue,priest",
                characters: [rogueConfig, priestConfig],
            },
            {
                id: "tomb_priest,ranger",
                characters: [priestConfig, rangerConfig],
            },
        ],
    }
}
