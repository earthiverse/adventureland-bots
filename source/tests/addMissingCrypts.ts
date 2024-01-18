import AL, { MapName, ServerIdentifier, ServerRegion } from "alclient"
import { CRYPT_ADD_TIME, getCryptWaitTime } from "../base/crypt.js"

async function run() {
    console.log("Connecting...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    const map: MapName = "winter_instance"
    const serverRegion: ServerRegion = "US"
    const serverIdentifier: ServerIdentifier = "III"

    for (const instance of [
        "SRKR0hON2KVPhMigxlqV3ybP",
    ]) {
        console.debug(`Trying to fix ${instance}...`)
        const data = []
        const now = Date.now()
        const future = now + getCryptWaitTime(map)
        for (const monster of AL.Game.G.maps[map].monsters) {
            const gMonster = AL.Game.G.monsters[monster.type]
            const x = (monster.boundary[0] + monster.boundary[2]) / 2
            const y = (monster.boundary[1] + monster.boundary[3]) / 2
            data.push({
                updateOne: {
                    filter: { in: instance, map: map, serverIdentifier: serverIdentifier, serverRegion: serverRegion, type: monster.type },
                    update: { hp: gMonster.hp, firstSeen: now, lastSeen: future, target: null, x: x, y: y },
                    upsert: true
                }
            })
        }
        console.debug(`Adding ${data.length} monsters...`)
        await AL.InstanceModel.updateOne({
            in: instance,
            map: map,
            serverIdentifier: serverIdentifier,
            serverRegion: serverRegion,
        }, {
            $max: {
                lastEntered: now
            },
            $min: {
                firstEntered: now
            }
        }, { upsert: true }).lean().exec().catch(() => { /* Suppress errors */ })
        await AL.EntityModel.bulkWrite(data)
    }

    console.debug("Disconnecting...")
}

run()