import AL, { MonsterName, ServerIdentifier, ServerRegion } from "alclient"
import { checkOnlyEveryMS, setLastCheck } from "./general.js"
import { XMAGE_MONSTERS } from "../strategy_pattern/setups/xmage.js"
import { CRYPT_MONSTERS, getCryptWaitTime } from "./crypt.js"

const MONSTER_CACHE = new Map<string, MonsterName[]>()

export async function getRecentSpecialMonsters(partyAllow: string[], specialMonsters: MonsterName[], serverIdentifier: ServerIdentifier, serverRegion: ServerRegion): Promise<MonsterName[]> {
    if (!AL.Database.connection) return [] // No database

    // Use the cache if we've recently checked
    const key = `${partyAllow.join(",")}_${specialMonsters.join(",")}_${serverIdentifier}_${serverRegion}}`
    if (MONSTER_CACHE.has(key) && !checkOnlyEveryMS(key, 5_000, false)) {
        return MONSTER_CACHE.get(key)
    }

    // Get the latest data
    const types: MonsterName[] = []
    for (const type of await AL.EntityModel.find(
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
            type: 1,
        },
    )
        .lean()
        .exec()) {
        types.push(type.type)
    }

    // Update the cache
    MONSTER_CACHE.set(key, types)
    setLastCheck(key)

    return types
}

export async function getRecentXMages(serverIdentifier: ServerIdentifier, serverRegion: ServerRegion): Promise<MonsterName[]> {
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
            $or: [
                { firstSeen: null },
                { firstSeen: { $lt: Date.now() - getCryptWaitTime("winter_instance") } },
            ],
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


export async function getRecentCryptMonsters(serverIdentifier: ServerIdentifier, serverRegion: ServerRegion): Promise<MonsterName[]> {
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