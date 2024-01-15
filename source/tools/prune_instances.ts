import AL, { GMap, MonsterName } from "alclient"
import { CRYPT_ADD_TIME } from "../base/crypt.js"

async function run() {
    console.log("Connecting...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    const instances = await AL.InstanceModel.find().lean().exec();
    for (const instance of instances) {
        console.debug(`Fixing ${instance.map} ${instance.in}...`)

        const deleteData: MonsterName[] = []
        const updateData = []
        const now = instance.firstEntered
        const future = Date.now() + CRYPT_ADD_TIME

        for (const monster of (AL.Game.G.maps[instance.map] as GMap).monsters) {
            if (instance.killed?.[monster.type] >= Math.max(monster.count, 1)) {
                deleteData.push(monster.type)
                continue // We've already killed them all
            }

            const gMonster = AL.Game.G.monsters[monster.type]
            const x = (monster.boundary[0] + monster.boundary[2]) / 2
            const y = (monster.boundary[1] + monster.boundary[3]) / 2
            updateData.push({
                updateOne: {
                    filter: {
                        in: instance.in,
                        map: instance.map,
                        serverIdentifier: instance.serverIdentifier,
                        serverRegion: instance.serverRegion,
                        type: monster.type,
                    },
                    update: {
                        $set: {
                            hp: gMonster.hp,
                            firstSeen: now,
                            lastSeen: future,
                            target: null,
                        },
                        $setOnInsert: {
                            x: x,
                            y: y
                        }
                    },
                    upsert: true,
                },
            })
        }

        if (updateData.length) {
            console.debug(`  ${updateData.length} monsters remain`)
            await AL.EntityModel.bulkWrite(updateData)
            if (deleteData.length) {
                await AL.EntityModel.deleteMany({ in: instance.in, serverIdentifier: instance.serverIdentifier, serverRegion: instance.serverRegion, type: { $in: [...deleteData] } }).lean().exec()
            }
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
