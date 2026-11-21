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
    // TODO: This can just use G data to figure it out, G.items[key].opens, I think
    switch (map) {
        case "crypt":
            return "cryptkey"
        case "tomb":
            return "tombkey"
        case "winter_instance":
            return "frozenkey"
    }
}

export function getCryptWaitTime(map: MapName): number {
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

export function isInstanceMonsterKilled(
    map: MapName,
    type: MonsterName,
    killed?: Partial<Record<MonsterName, number>>,
    gMap: GMap | undefined = AL.Game.G?.maps[map],
): boolean {
    if (!killed) return false

    // Sum all spawn entries for this type (maps may list the same monster in multiple boundaries)
    let totalCount = 0
    for (const monster of gMap?.monsters ?? []) {
        if (monster.type === type) totalCount += monster.count
    }
    return (killed[type] ?? 0) >= Math.max(totalCount, 1) // Phase spawns (respawn_as) have count 0
}

/**
 * Removes finished instances and leftover EntityModel records for already-killed monster types
 */
export async function cleanInstances() {
    if (!AL.Database.connection) return

    const instances = await AL.InstanceModel.find().lean().exec()
    for (const instance of instances) {
        if (!instance.killed) continue // Nothing has been killed yet

        // Collect unique special monster types for this instance map
        const gMap = AL.Game.G.maps[instance.map]
        const specialTypes = new Set<MonsterName>()
        for (const monster of gMap?.monsters ?? []) {
            if (AL.Constants.SPECIAL_MONSTERS.includes(monster.type)) specialTypes.add(monster.type)
        }

        // Partition special types into already killed vs. still remaining
        const killedTypes: MonsterName[] = []
        let deleteInstance = true
        for (const mtype of specialTypes) {
            if (isInstanceMonsterKilled(instance.map, mtype, instance.killed, gMap)) {
                killedTypes.push(mtype)
            } else {
                // There's something we haven't killed yet
                deleteInstance = false
            }
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
            continue
        }

        if (killedTypes.length) {
            // Remove leftover EntityModel docs for individual types already killed in this instance
            await AL.EntityModel.deleteMany({
                in: instance.in,
                serverIdentifier: instance.serverIdentifier,
                serverRegion: instance.serverRegion,
                type: { $in: killedTypes },
            })
                .lean()
                .exec()
        }
    }
}
