import TTLCache from "@isaacs/ttlcache"
import { Entity } from "alclient"

/** Monster ID, [timestamp, HP] */
const data = new TTLCache<string, [number, number][]>({ ttl: 60_000 })

export function getMsToDeath(monster: Entity) {
    // Add the current timestamp
    let monsterData: [number, number][] = data.get(monster.id) ?? []
    monsterData.push([Date.now(), monster.hp])
    data.set(monster.id, monsterData)

    // Prune the number of data points
    if (monsterData.length > 100) monsterData = monsterData.splice(monsterData.length - 100)

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

    return totalTime > 0 ? totalDamage / totalTime : Number.POSITIVE_INFINITY
}
