import AL, { MapName, ServerIdentifier, ServerRegion } from "alclient"
import { CRYPT_ADD_TIME } from "../base/crypt.js"

async function run() {
    console.log("Connecting...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    const map: MapName = "crypt"
    const serverRegion: ServerRegion = "US"
    const serverIdentifier: ServerIdentifier = "I"

    for (const instance of [
        "kr5lzGSsiPNppQWN11gwXaxV",
        "gTWcioF4znyz7IN7u6WV50cU",
        "QcDlD8AnDMlDNTFt2eIPkGhQ",
        "h2u5w9pVqR8kuVuDZGsvk7oW",
        "VgKqOBRpOuidgcq50Hp366Er"
    ]) {
        console.debug(`Trying to fix ${instance}...`)
        const data = []
        const now = Date.now() + CRYPT_ADD_TIME
        for (const monster of AL.Game.G.maps[map].monsters) {
            const gMonster = AL.Game.G.monsters[monster.type]
            const x = (monster.boundary[0] + monster.boundary[2]) / 2
            const y = (monster.boundary[1] + monster.boundary[3]) / 2
            data.push({
                updateOne: {
                    filter: { in: instance, map: map, serverIdentifier: serverIdentifier, serverRegion: serverRegion, type: monster.type },
                    update: { hp: gMonster.hp, firstSeen: now, lastSeen: now, target: null, x: x, y: y },
                    upsert: true
                }
            })
        }
        console.debug(`Adding ${data.length} monsters...`)
        await AL.EntityModel.bulkWrite(data)
    }

    console.debug("Disconnecting...")
}

run()