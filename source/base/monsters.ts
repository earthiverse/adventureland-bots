import AL, { MonsterName, PingCompensatedCharacter, ServerIdentifier, ServerRegion } from "alclient"
import { checkOnlyEveryMS, setLastCheck } from "./general.js"
import { CRYPT_MONSTERS, getCryptWaitTime } from "./crypt.js"
import { Strategist } from "../strategy_pattern/context.js"

export const TOMB_MONSTERS: MonsterName[] = ["ggreenpro", "gredpro", "gbluepro", "gpurplepro"]
export const XMAGE_MONSTERS: MonsterName[] = ["xmagex", "xmagen", "xmagefi", "xmagefz"]

const MONSTER_CACHE = new Map<string, MonsterName[]>()

export function invalidateMonsterCache(serverIdentifier?: ServerIdentifier, serverRegion?: ServerRegion) {
    if (!serverIdentifier || !serverRegion) {
        MONSTER_CACHE.clear()
        return
    }
    for (const key of MONSTER_CACHE.keys()) {
        if (key.includes(`${serverIdentifier}_${serverRegion}`)) {
            MONSTER_CACHE.delete(key)
        }
    }
}

export async function getRecentSpecialMonsters(
    partyAllow: string[],
    specialMonsters: MonsterName[],
    serverIdentifier: ServerIdentifier,
    serverRegion: ServerRegion,
    contexts?: Strategist<PingCompensatedCharacter>[],
): Promise<MonsterName[]> {
    if (!AL.Database.connection) return [] // No database

    // Use the cache if we've recently checked
    const key = `${partyAllow.join(",")}_${specialMonsters.join(",")}_${serverIdentifier}_${serverRegion}}`
    if (MONSTER_CACHE.has(key) && !checkOnlyEveryMS(key, 2_000, false)) {
        return MONSTER_CACHE.get(key)
    }

    // Get the latest data
    const types: MonsterName[] = []
    const entities = await AL.EntityModel.find(
        {
            $and: [
                {
                    $or: [
                        { target: undefined },
                        { target: { $in: partyAllow } },
                        { type: { $in: ["crabxx", "franky", "icegolem", "phoenix", "snowman", "wabbit"] } }, // Coop monsters will give credit
                    ],
                },
                {
                    $or: [{ "s.fullguardx": undefined }, { "s.fullguardx.ms": { $lt: 30_000 } }],
                },
                {
                    $or: [{ "s.fullguard": undefined }, { "s.fullguard.ms": { $lt: 30_000 } }],
                },
            ],
            lastSeen: { $gt: Date.now() - 60_000 },
            serverIdentifier: serverIdentifier,
            serverRegion: serverRegion,
            type: { $in: specialMonsters },
        },
        {
            _id: 1,
            in: 1,
            map: 1,
            name: 1,
            type: 1,
            x: 1,
            y: 1,
        },
    )
        .lean()
        .exec()

    entities: for (const entity of entities) {
        for (const context of contexts ?? []) {
            if (!context.isReady()) continue
            if (context.bot.serverData.name !== serverIdentifier || context.bot.serverData.region !== serverRegion)
                continue
            if (AL.Tools.distance(context.bot, entity) < AL.Constants.MAX_VISIBLE_RANGE / 2) {
                if (entity.name && !context.bot.entities.has(entity.name)) {
                    AL.EntityModel.deleteOne({ _id: entity._id }).lean().exec().catch(console.error)
                    continue entities
                }
            }
        }
        types.push(entity.type)
    }

    // Update the cache
    MONSTER_CACHE.set(key, types)
    setLastCheck(key)

    return types
}

export async function getRecentProtectors(
    serverIdentifier: ServerIdentifier,
    serverRegion: ServerRegion,
): Promise<MonsterName[]> {
    if (!AL.Database.connection) return [] // No database

    // Use the cache if we've recently checked
    const key = `protector_${serverIdentifier}_${serverRegion}}`
    if (MONSTER_CACHE.has(key) && !checkOnlyEveryMS(key, 5_000, false)) {
        return MONSTER_CACHE.get(key)
    }

    // Get the latest data
    const types: MonsterName[] = []
    for (const protector of await AL.EntityModel.find(
        {
            $or: [{ firstSeen: null }, { firstSeen: { $lt: Date.now() - getCryptWaitTime("tomb") } }],
            lastSeen: { $gt: Date.now() - 60000 },
            serverIdentifier: serverIdentifier,
            serverRegion: serverRegion,
            type: { $in: TOMB_MONSTERS },
        },
        {
            type: 1,
        },
    )
        .lean()
        .exec()) {
        types.push(protector.type)
    }

    // Update the cache
    MONSTER_CACHE.set(key, types)
    setLastCheck(key)

    return types
}

export async function getRecentXMages(
    serverIdentifier: ServerIdentifier,
    serverRegion: ServerRegion,
): Promise<MonsterName[]> {
    if (!AL.Database.connection) return [] // No database

    // Use the cache if we've recently checked
    const key = `xmage_${serverIdentifier}_${serverRegion}}`
    if (MONSTER_CACHE.has(key) && !checkOnlyEveryMS(key, 5_000, false)) {
        return MONSTER_CACHE.get(key)
    }

    // Get the latest data
    const types: MonsterName[] = []
    for (const xmage of await AL.EntityModel.find(
        {
            $or: [{ firstSeen: null }, { firstSeen: { $lt: Date.now() - getCryptWaitTime("winter_instance") } }],
            lastSeen: { $gt: Date.now() - 60000 },
            serverIdentifier: serverIdentifier,
            serverRegion: serverRegion,
            type: { $in: XMAGE_MONSTERS },
        },
        {
            type: 1,
        },
    )
        .lean()
        .exec()) {
        types.push(xmage.type)
    }

    // Update the cache
    MONSTER_CACHE.set(key, types)
    setLastCheck(key)

    return types
}

export async function getRecentCryptMonsters(
    serverIdentifier: ServerIdentifier,
    serverRegion: ServerRegion,
): Promise<MonsterName[]> {
    if (!AL.Database.connection) return [] // No database

    // Use the cache if we've recently checked
    const key = `crypt_${serverIdentifier}_${serverRegion}}`
    if (MONSTER_CACHE.has(key) && !checkOnlyEveryMS(key, 5_000, false)) {
        return MONSTER_CACHE.get(key)
    }

    // Get the latest data
    const types: MonsterName[] = []
    for (const cryptMonster of await AL.EntityModel.find(
        {
            $or: [{ firstSeen: null }, { firstSeen: { $lt: Date.now() - getCryptWaitTime("crypt") } }],
            lastSeen: { $gt: Date.now() - 60_000 },
            serverIdentifier: serverIdentifier,
            serverRegion: serverRegion,
            type: { $in: CRYPT_MONSTERS },
        },
        {
            type: 1,
        },
    )
        .lean()
        .exec()) {
        types.push(cryptMonster.type)
    }

    // Update the cache
    MONSTER_CACHE.set(key, types)
    setLastCheck(key)

    return types
}
