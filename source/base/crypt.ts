import AL, { Character, ItemName, MapName, MonsterName } from "alclient"

export const CRYPT_MONSTERS: MonsterName[] = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "vbat"]

/** Used to wait until crypt monsters have levelled a bit */
export const CRYPT_WAIT_TIME = 1.728e+8

/** Used to give us a little bit extra time to find and kill them */
export const CRYPT_ADD_TIME = 3_600_000

export async function addCryptMonstersToDB(bot: Character) {
    if (bot.map !== "crypt") throw "Only call this function in a crypt."

    const data = []
    const now = Date.now() + CRYPT_ADD_TIME

    for (const monster of AL.Game.G.maps[bot.map].monsters) {
        const gMonster = AL.Game.G.monsters[monster.type]
        const x = (monster.boundary[0] + monster.boundary[2]) / 2
        const y = (monster.boundary[1] + monster.boundary[3]) / 2
        data.push({
            updateOne: {
                filter: { in: bot.in, map: bot.map, serverIdentifier: bot.serverData.name, serverRegion: bot.serverData.region, type: monster.type },
                update: { hp: gMonster.hp, firstSeen: now, lastSeen: now, target: null, x: x, y: y },
                upsert: true
            }
        })
    }

    await AL.EntityModel.bulkWrite(data)
}

export function getKeyForCrypt(map: MapName): ItemName {
    switch (map) {
        case "crypt":
            return "cryptkey"
        case "winter_instance":
            return "frozenkey"
    }
}

export async function refreshCryptMonsters(bot: Character) {
    return AL.EntityModel.updateMany({
        serverIdentifier: bot.serverData.name,
        serverRegion: bot.serverData.region,
        map: bot.map,
        in: bot.in
    }, {
        lastSeen: Date.now() + CRYPT_ADD_TIME
    }).lean().exec()
}
