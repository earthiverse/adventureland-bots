import AL, { GMap, MapName, ServerIdentifier, ServerRegion } from "alclient"
import { CRYPT_ADD_TIME } from "../base/crypt.js"

async function run() {
    console.log("Connecting...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])


    const instances = await AL.InstanceModel.find().lean().exec();
    for (const instance of instances) {
        console.debug(`Trying to fix ${instance.map} ${instance.in}...`)

        const data = []
        const now = instance.firstEntered
        const future = Date.now() + CRYPT_ADD_TIME

        for (const monster of (AL.Game.G.maps[instance.map] as GMap).monsters) {
            if (instance.killed?.[monster.type] >= Math.max(monster.count, 1)) continue // We've already killed them all

            const gMonster = AL.Game.G.monsters[monster.type]
            const x = (monster.boundary[0] + monster.boundary[2]) / 2
            const y = (monster.boundary[1] + monster.boundary[3]) / 2
            data.push({
                updateOne: {
                    filter: {
                        in: instance.in,
                        map: instance.map,
                        serverIdentifier: instance.serverIdentifier,
                        serverRegion: instance.serverRegion,
                        type: monster.type,
                    },
                    update: { hp: gMonster.hp, firstSeen: now, lastSeen: future, target: null },
                    upsert: true,
                },
            })
        }

        if (data.length) {
            console.debug(`Adding ${data.length} monsters...`)
            await AL.EntityModel.bulkWrite(data)
        } else {
            console.debug(`Removing ${instance.map} ${instance.in}...`)
            await AL.InstanceModel.deleteOne({ _id: instance._id }).lean().exec()
            await AL.EntityModel.deleteMany({ in: instance.in, serverIdentifier: instance.serverIdentifier, serverRegion: instance.serverRegion }).lean().exec()
        }
    }

    console.debug("Disconnecting...")
    AL.Database.disconnect()
}

run()
