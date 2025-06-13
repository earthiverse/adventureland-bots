import AL, { MapName, ServerIdentifier, ServerRegion } from "alclient"
import { getCryptWaitTime } from "../base/crypt.js"

async function run() {
    console.log("Connecting...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    const map: MapName = "tomb"
    const serverRegion: ServerRegion = "US"
    const serverIdentifier: ServerIdentifier = "III"

    for (const instance of [
        "WhLJrnEPZdvekqfMaA9xsdcl",
        "F7wutgkFPfdiu47dFsbrTvNi",
        "zd0t5lnp8ri9cnsm0THUzqlw",
        "wsz5D14h6Gfu90BL22T7T5eP",
        "GHD18BaTmZN8srkCxl5SGsyk",
        "eHGFBaAz8H2IVGMPIBWoh2Hx",
        "eOesTNR8z0mJ9bR73mTb13rQ",
        "z2xxZfH9MPTtTIlx9py0G9yE",
        "DJccQsIcKkFe9RAqoX7vABc2",
        "yBekTepahmEQOotd29cT4sye",
        "gbUuUcbph7T4Glw3brzy7xD4",
        "f7qDzrVvHg3Lw6dPstRZeBN5",
        "PCJNpvHAgUOPy9Hl4J8bDCNQ",
        "zTNJzvLqU7xwgHBsJDXiQIve",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "kBel1DJwT5AFJ80BIJrmEahC",
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
                    filter: {
                        in: instance,
                        map: map,
                        serverIdentifier: serverIdentifier,
                        serverRegion: serverRegion,
                        type: monster.type,
                    },
                    update: { hp: gMonster.hp, firstSeen: now, lastSeen: future, target: null, x: x, y: y },
                    upsert: true,
                },
            })
        }
        console.debug(`Adding ${data.length} monsters...`)
        await AL.InstanceModel.updateOne(
            {
                in: instance,
                map: map,
                serverIdentifier: serverIdentifier,
                serverRegion: serverRegion,
            },
            {
                $max: {
                    lastEntered: now,
                },
                $min: {
                    firstEntered: now,
                },
            },
            { upsert: true },
        )
            .lean()
            .exec()
            .catch(() => {
                /* Suppress errors */
            })
        await AL.EntityModel.bulkWrite(data)
    }

    console.debug("Disconnecting...")
}

run()
