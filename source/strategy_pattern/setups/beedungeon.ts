import { Character, Entity, GetEntityFilters, IPosition, MapName, MonsterName, PingCompensatedCharacter } from "alclient"
import { Strategist, filterContexts } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { KiteMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base.js"
import { suppress_errors } from "../logging.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export const BEE_DUNGEON_MONSTERS: MonsterName[] = ["bee_worker" as MonsterName, "bee_drone" as MonsterName, "bee_queen" as MonsterName]

class BeeDungeonMoveStratey extends KiteMonsterMoveStrategy {
    public constructor(contexts: Strategist<PingCompensatedCharacter>[]) {
        super({
            contexts: contexts,
            typeList: BEE_DUNGEON_MONSTERS
        })

        // Only include dungeon map positions
        this.spawns = this.spawns.filter(p => p.map === "bee_dungeon" as MapName)
    }

    protected async move(bot: Character): Promise<IPosition> {
        const filter: GetEntityFilters = { ...this.options, typeList: undefined, returnNearest: true }

        for (const type of BEE_DUNGEON_MONSTERS) {
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

        return super.move(bot) // Go find an entity
    }
}

export function constructBeeDungeonSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new BeeDungeonMoveStratey(contexts)

    return {
        configs: [
            {
                id: "crypt_mage,priest,ranger",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            typeList: BEE_DUNGEON_MONSTERS,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: BEE_DUNGEON_MONSTERS,
                            enableAbsorbToTank: true
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            typeList: BEE_DUNGEON_MONSTERS
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}