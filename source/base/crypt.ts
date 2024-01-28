import AL, { Character, GMap, ItemName, MapName, MonsterName } from "alclient"

export const CRYPT_MONSTERS: MonsterName[] = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "vbat"]

/** Used to wait until crypt monsters have levelled a bit (1.944e+8ms is 54 hours) */
export const CRYPT_WAIT_TIME = 1.944e8

/** Used to give us extra time to find and kill them */
export const CRYPT_ADD_TIME = 8.64e7

export async function addCryptMonstersToDB(bot: Character, map = bot.map, instance: string = bot.in) {
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
        case "bee_dungeon" as MapName:
            return "beekey" as ItemName
        case "crypt":
            return "cryptkey"
        case "winter_instance":
            return "frozenkey"
    }
}

export function getCryptWaitTime(map: MapName): number {
    const today = new Date()
    const month = today.getMonth()
    const year = today.getFullYear()

    if (
        // From the beginning of October
        month >= 9 ||
        // To the end of April
        month <= 3
    ) {
        // Don't wait for crypts to open
        return 0
    }

    switch (map) {
        case "crypt":
            return CRYPT_WAIT_TIME
        default:
            return 0
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

/**
 * Removes the instance and monsters from the DB if we've killed all the monsters in it
 */
export async function cleanInstances() {
    if (!AL.Database.connection) return

    const instances = await AL.InstanceModel.find().lean().exec()
    for (const instance of instances) {
        if (!instance.killed) continue // Nothing has been killed yet

        let deleteInstance = true

        for (const monster of (AL.Game.G.maps[instance.map] as GMap).monsters) {
            const mtype = monster.type
            if (!AL.Constants.SPECIAL_MONSTERS.includes(mtype)) continue // It's not special
            if (instance.killed[mtype] >= Math.max(monster.count, 1)) continue // We've already killed them all

            // There's something we haven't killed yet
            deleteInstance = false
            break
        }

        if (deleteInstance) {
            console.debug(`Removing ${instance.map} ${instance.in}...`)
            await AL.InstanceModel.deleteOne({ _id: instance._id }).lean().exec()
            await AL.EntityModel.deleteMany({
                in: instance.in,
                serverIdentifier: instance.serverIdentifier,
                serverRegion: instance.serverRegion,
            })
                .lean()
                .exec()
        }
    }
}
