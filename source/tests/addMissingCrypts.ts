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
        "ETZVkxEzEF4ANddeCcd2PMkF",
        "EXDa6aWMTWRqKsw8sPlKkb02",
        "F7wutgkFPfdiu47dFsbrTvNi",
        "GHD18BaTmZN8srkCxl5SGsyk",
        "GZa648efCTWb9auR5eWDeLUX",
        "HVFAWo9o1rMAHaVcnc7mWQTz",
        "HlhALMC8luQxTHbSKUAAiAOD",
        "IE5LferLlf3y4uMseQSprJ3g",
        "IdvTZSwpFrsJWvzDqWg7lBI8",
        "Ie1QtU2n0KvShPWuOnmsTk5I",
        "J6eTX2GfeND9szda1GP6J5O4",
        "JCZnzDTyKzOFTTvpHp54l2Og",
        "JJ68lzcs93vfBygc655q37CX",
        "L0pCQDnz4WJbmqhOgmvGEOww",
        "LBSTrV1BEzqNuaGdsci6MKao",
        "LwhnyTEFR37Xk4tIEnPt2ZJR",
        "M3En2c5ndwBLkBsTFyLOBgKL",
        "MpiUdyf3pwpFbXTLQa8eFzJC",
        "Nxg8nMiiC4d4DFgoTcx8dGBF",
        "OskTNmDut0BNf0IH4fOyxugp",
        "PBvEaxPWgIvQXfDwJHsTFcmN",
        "PCJNpvHAgUOPy9Hl4J8bDCNQ",
        "PJgXvKUe34kcEoNGOl4oT485",
        "PMpTAOQINpRLKDAkRet3DToc",
        "QJcwSG5nQGOcEG7oJHMsvVdt",
        "QuZNLGV50OuqsrTuBUTepCSJ",
        "S4De6E3KfWOFSIwV8hBfH8UG",
        "SaohQ9AT92ObIIlutUgASl4b",
        "T2u38lSUbWpTiOMA1EhoBQVT",
        "Toby5dqfFAkS32AqDpSCu56i",
        "Tuvv8PpAqeHrgdd2NmOkI2Eh",
        "V9R1xqSAu9Pcs262IqCxprL8",
        "VBNHHQfbBNI14fPV4WuP13lq",
        "WKbtPF9AsnSrPxgfTE5T320M",
        "WMcGqH5TsxUQ8KsIO7cVhTa8",
        "WTH47xo7eHeqNvM6IOTisuw7",
        "WhLJrnEPZdvekqfMaA9xsdcl",
        "Wy5LLGAkKnTFL2w0HCGnZJJw",
        "X9yKnRQyRsH8T7NeIyHcF3G4",
        "XgLnNJqkeJbx27EVwkgkhKUF",
        "ZsvV0HtCU8pLnbcEhrMUidoZ",
        "aDoVhACVv9GRv3x8iDMsneTa",
        "aV9dGBvoleTOybdBSHcCSZUw",
        "abML1JS7aA2V9IdMTg19BXXe",
        "bythPGo24XUVDcIhMHrTDMIM",
        "cGPUTiq8TLvTb8Sv4OhylB5A",
        "dwHLbpTReWkxbkgJOaBZNxM7",
        "eDpvcgAQ6gDuCVgnToJ1DpUo",
        "eHGFBaAz8H2IVGMPIBWoh2Hx",
        "eOesTNR8z0mJ9bR73mTb13rQ",
        "efXDwlavwHCFqSpSPKXwz7U4",
        "euVFmQxd1CCQ8vqpvouTukWo",
        "evv7CThaxrpMkocLtNbIWmJb",
        "f7qDzrVvHg3Lw6dPstRZeBN5",
        "fT5EXhB7bsAZCZVqA3vk1WyU",
        "fgAeO5zlwIOr8TGZZUHopHHv",
        "g29P9DkZn3kh0bNvqN2Tiey8",
        "gPKz5OJiz2UtppovQWk008QQ",
        "gbUuUcbph7T4Glw3brzy7xD4",
        "gyuRW8HGXhy9uvQwyw1puRN8",
        "hrT5XyPPO40Oebcnsbdedgd9",
        "iW8XocFUb221IJEuFTwM1Zmx",
        "ieo8BDgISa7h1tLf5o75iQbX",
        "kBel1DJwT5AFJ80BIJrmEahC",
        "kTQT8FRMonaI0pV677545pI2",
        "lMcN1FZnpNfTmXxlKNxM3fqz",
        "mL8ogzbV0iAXfesmpg3xoO1o",
        "mTVHICZlLVyL8qvWv6W0SrTK",
        "mbIRA5VVU71c3imE4BBuES0W",
        "moOFZo0Qkq7E1ML4s3nfGPKN",
        "ozWn358zmDBCBro4pBVeBIxy",
        "q2HQaGpRhWfPTskMx2SWBWXl",
        "qyQgKl9glZgkpsWDlgWfDCGI",
        "r74PFztG1PL2BaftPFolqPG4",
        "rMEyPLZT25CeVdE7kp6OvPXD",
        "sUr1rdIyTWqg5XNhOvJFxIB4",
        "sXwtEd3tKWF5Z29OeNlVTuEA",
        "tNAhL7TdSOQ6xbbkubWm4OPs",
        "tuLPFk3stzmiV9iZahf45qSa",
        "uHdLHBAwl9caEQGtlNiFRG1o",
        "uKf6CfBmxDAWsv5Sokk2AOOe",
        "vB0kIqSTRHhU4sayriMAkTWo",
        "vcBvGcHVBmrOhep1PCStETPi",
        "vcz9ltJqdVbU6IRIw1uMHzZi",
        "vdnQJehkPKsivZlACequ7uqw",
        "wM7sEi3Dkl4b2OA9KUbsSl0R",
        "wsz5D14h6Gfu90BL22T7T5eP",
        "wuJH9fHI3E9yETXgSRWKJDB4",
        "x7DUlq2sH2tye32o0HN6UNPI",
        "xed7EKwKBnwDfbGAoxUEilkg",
        "yBekTepahmEQOotd29cT4sye",
        "z2xxZfH9MPTtTIlx9py0G9yE",
        "z4s8bHVy7V06e6IIz48iUbJz",
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
