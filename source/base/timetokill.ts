import TTLCache from "@isaacs/ttlcache"
import { Entity } from "alclient"

/** Monster key (type_id), [timestamp, HP] */
const data = new TTLCache<string, [number, number][]>({ ttl: 300_000 })
/** Monster key (type_id), timestamp of last HP drop */
const lastHpDrop = new TTLCache<string, number>({ ttl: 300_000 })

export function recordHp(type: string, id: string, hp: number): void {
    const key = `${type}_${id}`
    const now = Date.now()
    let monsterData: [number, number][] = data.get(key) ?? []

    const lastEntry = monsterData[monsterData.length - 1]
    if (!lastEntry) {
        lastHpDrop.set(key, now)
        monsterData.push([now, hp])
    } else {
        if (hp < lastEntry[1]) {
            lastHpDrop.set(key, now)
        }
        // Only record a new entry if HP changed or at least 1s has elapsed
        if (hp !== lastEntry[1] || now - lastEntry[0] >= 1_000) {
            monsterData.push([now, hp])
        }
    }

    // Prune entries older than 5 minutes or exceeding 300 entries
    if (monsterData.length > 300) {
        monsterData = monsterData.slice(-300)
    }
    data.set(key, monsterData)
}

export function getMsSinceLastHpDrop(type: string, id: string): number {
    const key = `${type}_${id}`
    const lastDrop = lastHpDrop.get(key)
    if (lastDrop === undefined) return 0
    return Date.now() - lastDrop
}

export function getMsToDeath(monster: Entity): number
export function getMsToDeath(type: string, id: string, hp: number): number
export function getMsToDeath(monsterOrType: Entity | string, id?: string, hp?: number): number {
    let type: string
    let monsterId: string
    let currentHp: number

    if (typeof monsterOrType === "string") {
        type = monsterOrType
        monsterId = id
        currentHp = hp
    } else {
        type = monsterOrType.type
        monsterId = monsterOrType.id
        currentHp = monsterOrType.hp
    }

    recordHp(type, monsterId, currentHp)
    const key = `${type}_${monsterId}`
    const monsterData = data.get(key) ?? []

    // Calculate the damage over time
    let totalDamage = 0
    let totalTime = 0
    for (let i = 1; i < monsterData.length; i++) {
        const [previousTime, previousHP] = monsterData[i - 1]
        const [currentTime, currentHP] = monsterData[i]

        const damage = previousHP - currentHP
        const timeDifference = currentTime - previousTime

        totalDamage += damage
        totalTime += timeDifference
    }

    const damagePerMs = totalDamage / totalTime

    return totalTime > 0 && damagePerMs > 0 ? currentHp / damagePerMs : Number.POSITIVE_INFINITY
}
