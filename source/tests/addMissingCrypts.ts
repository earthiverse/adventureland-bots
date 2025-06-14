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
        "WhLJrnEPZdvekqfMaA9xsdcl",
        "F7wutgkFPfdiu47dFsbrTvNi",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "zTNJzvLqU7xwgHBsJDXiQIve",
        "PCJNpvHAgUOPy9Hl4J8bDCNQ",
        "f7qDzrVvHg3Lw6dPstRZeBN5",
        "gbUuUcbph7T4Glw3brzy7xD4",
        "yBekTepahmEQOotd29cT4sye",
        "z2xxZfH9MPTtTIlx9py0G9yE",
        "eOesTNR8z0mJ9bR73mTb13rQ",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "zTNJzvLqU7xwgHBsJDXiQIve",
        "z2xxZfH9MPTtTIlx9py0G9yE",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "PCJNpvHAgUOPy9Hl4J8bDCNQ",
        "f7qDzrVvHg3Lw6dPstRZeBN5",
        "yBekTepahmEQOotd29cT4sye",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "PCJNpvHAgUOPy9Hl4J8bDCNQ",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "PCJNpvHAgUOPy9Hl4J8bDCNQ",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "PCJNpvHAgUOPy9Hl4J8bDCNQ",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "yBekTepahmEQOotd29cT4sye",
        "zTNJzvLqU7xwgHBsJDXiQIve",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "zTNJzvLqU7xwgHBsJDXiQIve",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "zTNJzvLqU7xwgHBsJDXiQIve",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "V9R1xqSAu9Pcs262IqCxprL8",
        "fgAeO5zlwIOr8TGZZUHopHHv",
        "BVNoRbvCxznT30LT4Q0D2drh",
        "DyPJQf9wOFB6Sq5RRHg7FlQS",
        "BVNoRbvCxznT30LT4Q0D2drh",
        "DyPJQf9wOFB6Sq5RRHg7FlQS",
        "tNAhL7TdSOQ6xbbkubWm4OPs",
        "r74PFztG1PL2BaftPFolqPG4",
        "DyPJQf9wOFB6Sq5RRHg7FlQS",
        "tNAhL7TdSOQ6xbbkubWm4OPs",
        "PJgXvKUe34kcEoNGOl4oT485",
        "tNAhL7TdSOQ6xbbkubWm4OPs",
        "AngCXDx4ZGW46ESRZbT18r9h",
        "PJgXvKUe34kcEoNGOl4oT485",
        "vcBvGcHVBmrOhep1PCStETPi",
        "PJgXvKUe34kcEoNGOl4oT485",
        "vcBvGcHVBmrOhep1PCStETPi",
        "PJgXvKUe34kcEoNGOl4oT485",
        "QJcwSG5nQGOcEG7oJHMsvVdt",
        "vcBvGcHVBmrOhep1PCStETPi",
        "JJ68lzcs93vfBygc655q37CX",
        "iW8XocFUb221IJEuFTwM1Zmx",
        "JJ68lzcs93vfBygc655q37CX",
        "iW8XocFUb221IJEuFTwM1Zmx",
        "Toby5dqfFAkS32AqDpSCu56i",
        "iW8XocFUb221IJEuFTwM1Zmx",
        "Toby5dqfFAkS32AqDpSCu56i",
        "iW8XocFUb221IJEuFTwM1Zmx",
        "Toby5dqfFAkS32AqDpSCu56i",
        "aV9dGBvoleTOybdBSHcCSZUw",
        "evv7CThaxrpMkocLtNbIWmJb",
        "aV9dGBvoleTOybdBSHcCSZUw",
        "evv7CThaxrpMkocLtNbIWmJb",
        "Toby5dqfFAkS32AqDpSCu56i",
        "S4De6E3KfWOFSIwV8hBfH8UG",
        "aV9dGBvoleTOybdBSHcCSZUw",
        "S4De6E3KfWOFSIwV8hBfH8UG",
        "Ie1QtU2n0KvShPWuOnmsTk5I",
        "aV9dGBvoleTOybdBSHcCSZUw",
        "T2u38lSUbWpTiOMA1EhoBQVT",
        "ZsvV0HtCU8pLnbcEhrMUidoZ",
        "vdnQJehkPKsivZlACequ7uqw",
        "hrT5XyPPO40Oebcnsbdedgd9",
        "vdnQJehkPKsivZlACequ7uqw",
        "zpQ8XR4Msimz4DdoOF4zQho5",
        "hrT5XyPPO40Oebcnsbdedgd9",
        "zpQ8XR4Msimz4DdoOF4zQho5",
        "vdnQJehkPKsivZlACequ7uqw",
        "aV9dGBvoleTOybdBSHcCSZUw",
        "zpQ8XR4Msimz4DdoOF4zQho5",
        "vdnQJehkPKsivZlACequ7uqw",
        "zpQ8XR4Msimz4DdoOF4zQho5",
        "aV9dGBvoleTOybdBSHcCSZUw",
        "zpQ8XR4Msimz4DdoOF4zQho5",
        "vdnQJehkPKsivZlACequ7uqw",
        "zpQ8XR4Msimz4DdoOF4zQho5",
        "vdnQJehkPKsivZlACequ7uqw",
        "zpQ8XR4Msimz4DdoOF4zQho5",
        "vdnQJehkPKsivZlACequ7uqw",
        "XgLnNJqkeJbx27EVwkgkhKUF",
        "vcz9ltJqdVbU6IRIw1uMHzZi",
        "COqzXLMtiDBDQXcIRTK8sSKk",
        "vcz9ltJqdVbU6IRIw1uMHzZi",
        "COqzXLMtiDBDQXcIRTK8sSKk",
        "uKf6CfBmxDAWsv5Sokk2AOOe",
        "COqzXLMtiDBDQXcIRTK8sSKk",
        "uKf6CfBmxDAWsv5Sokk2AOOe",
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
