import AL, { Character, ItemName, MapName, MonsterName } from "alclient"

export const CRYPT_MONSTERS: MonsterName[] = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "vbat"]

/** Used to wait until crypt monsters have levelled a bit (1.944e+8ms is 54 hours) */
export const CRYPT_WAIT_TIME = 1.944e8

/** Used to give us extra time to find and kill them */
export const CRYPT_ADD_TIME = 8.64e+7

export async function addCryptMonstersToDB(bot: Character, map = bot.map, instance: string = bot.in) {
    if (map !== "crypt") throw "Only call this function in a crypt."

    const data = []
    const now = Date.now()

    for (const monster of AL.Game.G.maps[map].monsters) {
        if (monster.count === 0) continue
        const gMonster = AL.Game.G.monsters[monster.type]
        const x = (monster.boundary[0] + monster.boundary[2]) / 2
        const y = (monster.boundary[1] + monster.boundary[3]) / 2
        data.push({
            updateOne: {
                filter: {
                    in: instance,
                    map: map,
                    serverIdentifier: bot.serverData.name,
                    serverRegion: bot.serverData.region,
                    type: monster.type,
                },
                update: { hp: gMonster.hp, firstSeen: now, lastSeen: now, target: null, x: x, y: y },
                upsert: true,
            },
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

export function getCryptWaitTime(map: MapName): number {
    switch(map) {
        case "crypt":
            return CRYPT_WAIT_TIME;
        default:
            return 0;
    }
}

export async function refreshCryptMonsters(bot: Character, map = bot.map, instance = bot.in) {
    return AL.EntityModel.updateMany(
        {
            serverIdentifier: bot.serverData.name,
            serverRegion: bot.serverData.region,
            map: map,
            in: instance,
        },
        {
            lastSeen: Date.now() + CRYPT_ADD_TIME,
        },
    )
        .lean()
        .exec()
}
