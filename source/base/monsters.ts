import AL, { MapName, MonsterName, PingCompensatedCharacter, ServerIdentifier, ServerRegion } from "alclient"
import { checkOnlyEveryMS, setLastCheck } from "./general.js"
import { CRYPT_MONSTERS, getCryptWaitTime, isInstanceMonsterKilled } from "./crypt.js"
import { Strategist } from "../strategy_pattern/context.js"

export { isInstanceMonsterKilled }

export const TOMB_MONSTERS: MonsterName[] = ["gbluepro", "gredpro", "ggreenpro", "gpurplepro"]
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
                        { target: null },
                        { target: { $in: partyAllow } },
                        { type: { $in: ["crabxx", "franky", "icegolem", "phoenix", "rharpy", "snowman", "wabbit"] } }, // Coop monsters will give credit
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

async function getRecentInstanceMonsters(
    cachePrefix: string,
    map: MapName,
    monsterTypes: MonsterName[],
    serverIdentifier: ServerIdentifier,
    serverRegion: ServerRegion,
): Promise<MonsterName[]> {
    if (!AL.Database.connection) return [] // No database

    // Use the cache if we've recently checked
    const key = `${cachePrefix}_${serverIdentifier}_${serverRegion}`
    if (MONSTER_CACHE.has(key) && !checkOnlyEveryMS(key, 5_000, false)) {
        return MONSTER_CACHE.get(key)
    }

    // Get the latest data
    const entities = await AL.EntityModel.find(
        {
            $or: [{ firstSeen: null }, { firstSeen: { $lt: Date.now() - getCryptWaitTime(map) } }],
            lastSeen: { $gt: Date.now() - 300_000 },
            serverIdentifier: serverIdentifier,
            serverRegion: serverRegion,
            type: { $in: monsterTypes },
        },
        {
            _id: 1,
            in: 1,
            type: 1,
        },
    )
        .lean()
        .exec()

    // Load kill counts for each referenced instance
    const instanceIds = [
        ...new Set(entities.map((entity) => entity.in).filter((id): id is string => Boolean(id && id !== map))),
    ]
    const killedByInstance = new Map<string, Partial<Record<MonsterName, number>>>()
    if (instanceIds.length) {
        const instances = await AL.InstanceModel.find(
            {
                in: { $in: instanceIds },
                map: map,
                serverIdentifier: serverIdentifier,
                serverRegion: serverRegion,
            },
            {
                _id: 0,
                in: 1,
                killed: 1,
            },
        )
            .lean()
            .exec()
        for (const instance of instances) {
            if (instance.in && instance.killed) killedByInstance.set(instance.in, instance.killed)
        }
    }

    // Filter out and delete entities whose type is already cleared in that instance
    const types: MonsterName[] = []
    const staleEntityIds = []
    for (const entity of entities) {
        const killed = entity.in ? killedByInstance.get(entity.in) : undefined
        if (isInstanceMonsterKilled(map, entity.type, killed)) {
            // Leftover placeholder or stale entity doc from an already-killed spawn
            staleEntityIds.push(entity._id)
            continue
        }
        types.push(entity.type)
    }
    if (staleEntityIds.length) {
        AL.EntityModel.deleteMany({ _id: { $in: staleEntityIds } })
            .lean()
            .exec()
            .catch(console.error)
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
    return getRecentInstanceMonsters("protector", "tomb", TOMB_MONSTERS, serverIdentifier, serverRegion)
}

export async function getRecentXMages(
    serverIdentifier: ServerIdentifier,
    serverRegion: ServerRegion,
): Promise<MonsterName[]> {
    return getRecentInstanceMonsters("xmage", "winter_instance", XMAGE_MONSTERS, serverIdentifier, serverRegion)
}

export async function getRecentCryptMonsters(
    serverIdentifier: ServerIdentifier,
    serverRegion: ServerRegion,
): Promise<MonsterName[]> {
    return getRecentInstanceMonsters("crypt", "crypt", CRYPT_MONSTERS, serverIdentifier, serverRegion)
}
