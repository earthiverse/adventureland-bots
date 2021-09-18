import AL from "alclient"
import { CryptData } from "../definitions/bot"

export function startCrypt(instance: string): CryptData {
    const data: CryptData = {
        instance: instance,
        remaining: {}
    }
    for (const monster of AL.Game.G.maps.crypt.monsters) {
        if (data[monster.type] === undefined) data.remaining[monster.type] = 0
        if (monster.count == 0) {
            // It's a special monster that will spawn after another type dies
            data.remaining[monster.type] += 1
        } else {
            data.remaining[monster.type] += monster.count
        }
    }
    return data
}

export function isCryptFinished(data: CryptData): boolean {
    if (data == undefined) return true // No crypt data, assume finished

    for (const m in data.remaining) {
        if (data.remaining[m as AL.MonsterName] !== 0) return false // Something remains
    }
    return true
}