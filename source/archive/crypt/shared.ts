import AL, { Character, Entity, IPosition, MonsterName } from "alclient"

export const CRYPT_MONSTERS: MonsterName[] = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", /** a8 */ "vbat"]

export function addCryptMonstersToDB(bot: Character) {
    if (bot.map !== "crypt") throw "Only call this function in a crypt."

    const data = []
    const now = Date.now()

    for (const monster of AL.Game.G.maps[bot.map].monsters) {
        const gMonster = AL.Game.G.monsters[monster.type]
        const x = (monster.boundary[0] + monster.boundary[2]) / 2
        const y = (monster.boundary[1] + monster.boundary[3]) / 2
        data.push({
            updateOne: {
                filter: { in: bot.in, map: bot.map, serverIdentifier: bot.serverData.name, serverRegion: bot.serverData.region, type: monster.type },
                update: { hp: gMonster.hp, lastSeen: now, target: null, x: x, y: y },
                upsert: true
            }
        })
    }

    AL.EntityModel.bulkWrite(data)
}

export function getNearestCryptMonster(bot: Character): Entity {
    const nearby = bot.getEntity({ returnNearest: true, typeList: CRYPT_MONSTERS })
    if (nearby) {
        if (nearby.type == "a8") {
            if (nearby.level <= 2) return nearby
        } else {
            return nearby
        }
    }
}

export async function getCryptMonsterLocation(bot: Character): Promise<IPosition> {
    const nearby = getNearestCryptMonster(bot)
    if (nearby) return nearby

    const db = await AL.EntityModel.find({
        $or: [{
            $or: [{ level: null }, { level: { $lte: 2 } }],
            type: "a8",
        }, {
            type: { $in: CRYPT_MONSTERS, $nin: ["a8"] }
        }],
    }).sort({
        lastSeen: -1
    }).lean().exec()
    return db[0]
}