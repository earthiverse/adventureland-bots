import AL, { MapName, ServerIdentifier, ServerRegion } from "alclient"
import { getCryptWaitTime } from "../base/crypt.js"

async function run() {
    console.log("Connecting...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    const map: MapName = "tomb"
    const serverRegion: ServerRegion = "US"
    const serverIdentifier: ServerIdentifier = "III"

    for (const instance of [
        "AOp2BihFJAVo2Ug1xyNqIULm",
        "AngCXDx4ZGW46ESRZbT18r9h",
        "BVNoRbvCxznT30LT4Q0D2drh",
        "C7CQhh1vQl927Td0wubwhAud",
        "COqzXLMtiDBDQXcIRTK8sSKk",
        "CgZ6bHKmkpFwJhzN2lmVdNF9",
        "DJccQsIcKkFe9RAqoX7vABc2",
        "DyPJQf9wOFB6Sq5RRHg7FlQS",
        "F7wutgkFPfdiu47dFsbrTvNi",
        "GHD18BaTmZN8srkCxl5SGsyk",
        "GZa648efCTWb9auR5eWDeLUX",
        "IdvTZSwpFrsJWvzDqWg7lBI8",
        "Ie1QtU2n0KvShPWuOnmsTk5I",
        "J6eTX2GfeND9szda1GP6J5O4",
        "JJ68lzcs93vfBygc655q37CX",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "OskTNmDut0BNf0IH4fOyxugp",
        "PCJNpvHAgUOPy9Hl4J8bDCNQ",
        "PJgXvKUe34kcEoNGOl4oT485",
        "QJcwSG5nQGOcEG7oJHMsvVdt",
        "S4De6E3KfWOFSIwV8hBfH8UG",
        "T2u38lSUbWpTiOMA1EhoBQVT",
        "Toby5dqfFAkS32AqDpSCu56i",
        "V9R1xqSAu9Pcs262IqCxprL8",
        "WKbtPF9AsnSrPxgfTE5T320M",
        "WMcGqH5TsxUQ8KsIO7cVhTa8",
        "WhLJrnEPZdvekqfMaA9xsdcl",
        "X9yKnRQyRsH8T7NeIyHcF3G4",
        "XgLnNJqkeJbx27EVwkgkhKUF",
        "ZsvV0HtCU8pLnbcEhrMUidoZ",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "aV9dGBvoleTOybdBSHcCSZUw",
        "abML1JS7aA2V9IdMTg19BXXe",
        "eDpvcgAQ6gDuCVgnToJ1DpUo",
        "eHGFBaAz8H2IVGMPIBWoh2Hx",
        "eOesTNR8z0mJ9bR73mTb13rQ",
        "euVFmQxd1CCQ8vqpvouTukWo",
        "evv7CThaxrpMkocLtNbIWmJb",
        "f7qDzrVvHg3Lw6dPstRZeBN5",
        "fgAeO5zlwIOr8TGZZUHopHHv",
        "gPKz5OJiz2UtppovQWk008QQ",
        "gbUuUcbph7T4Glw3brzy7xD4",
        "hrT5XyPPO40Oebcnsbdedgd9",
        "iW8XocFUb221IJEuFTwM1Zmx",
        "kBel1DJwT5AFJ80BIJrmEahC",
        "lMcN1FZnpNfTmXxlKNxM3fqz",
        "qyQgKl9glZgkpsWDlgWfDCGI",
        "r74PFztG1PL2BaftPFolqPG4",
        "tNAhL7TdSOQ6xbbkubWm4OPs",
        "uKf6CfBmxDAWsv5Sokk2AOOe",
        "vB0kIqSTRHhU4sayriMAkTWo",
        "vcBvGcHVBmrOhep1PCStETPi",
        "vcz9ltJqdVbU6IRIw1uMHzZi",
        "vdnQJehkPKsivZlACequ7uqw",
        "wsz5D14h6Gfu90BL22T7T5eP",
        "x7DUlq2sH2tye32o0HN6UNPI",
        "yBekTepahmEQOotd29cT4sye",
        "z2xxZfH9MPTtTIlx9py0G9yE",
        "zTNJzvLqU7xwgHBsJDXiQIve",
        "zcTFoVc6SVQkVFSbwHkbt3Cs",
        "zd0t5lnp8ri9cnsm0THUzqlw",
        "zpQ8XR4Msimz4DdoOF4zQho5",
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
