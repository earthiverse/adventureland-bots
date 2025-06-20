import AL, { MapName, ServerIdentifier, ServerRegion } from "alclient"
import { getCryptWaitTime } from "../base/crypt.js"

async function run() {
    console.log("Connecting...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    const map: MapName = "tomb"
    const serverRegion: ServerRegion = "US"
    const serverIdentifier: ServerIdentifier = "III"

    for (const instance of [
        "BhzcaG1Pu9rPcQTdIZUtoVLC",
        "C1dxagoZkNCFA65KiUnpnVmW",
        "CZvXN1P81qXcWLKc0rJoNnaI",
        "CeUJbAnzFxdXc2SI5Qhh7IgL",
        "EBvJdBwfTb3rdR73fG4vyCxX",
        "ELd7TVWkZ7q3Rlyhh64xtzAk",
        "ETZVkxEzEF4ANddeCcd2PMkF",
        "EXDa6aWMTWRqKsw8sPlKkb02",
        "EawEOS7c5nv2z52svercJDhd",
        "FhRoNnpT3yRFSTM0HmzSATZD",
        "Fyb36UqHbi0T3JZuMgJVUTST",
        "HVFAWo9o1rMAHaVcnc7mWQTz",
        "HlhALMC8luQxTHbSKUAAiAOD",
        "IE5LferLlf3y4uMseQSprJ3g",
        "Ir6k0ccQXcr3e1BzHf3I44Xe",
        "JCZnzDTyKzOFTTvpHp54l2Og",
        "JF9JbevK526lkUIvudgpskNx",
        "KCZMnOX39HHTRpLALTp3dFzK",
        "L0pCQDnz4WJbmqhOgmvGEOww",
        "LLeBvLqJRU6RSUabz80muFLP",
        "LwhnyTEFR37Xk4tIEnPt2ZJR",
        "M3En2c5ndwBLkBsTFyLOBgKL",
        "MAlDzJFoyfzG4zfRLXAPKpTW",
        "MpiUdyf3pwpFbXTLQa8eFzJC",
        "ND0cTuCEmlTJG1atJwN6bZhm",
        "Nxg8nMiiC4d4DFgoTcx8dGBF",
        "PBvEaxPWgIvQXfDwJHsTFcmN",
        "PMpTAOQINpRLKDAkRet3DToc",
        "Pbpp8Qcyvz8t4CxIgcuNHUk3",
        "Pndi8TBPT6g1DQW1CAAbBd3P",
        "QTaLTFrrBSKiCHdIuAd30DWw",
        "QuZNLGV50OuqsrTuBUTepCSJ",
        "RxWDTlmToCS0COFawWwzA5IP",
        "Rz0VhBGs1kTlPupUvW2mrCgQ",
        "SaohQ9AT92ObIIlutUgASl4b",
        "SukTqOTsuXLBAsLaqXpL1Uop",
        "Tuvv8PpAqeHrgdd2NmOkI2Eh",
        "U5hgJ0NO8KTKd4z5OIp5fA4P",
        "VBNHHQfbBNI14fPV4WuP13lq",
        "VdxxnbefLetEnLlLCuAJV3n4",
        "WTH47xo7eHeqNvM6IOTisuw7",
        "Wy5LLGAkKnTFL2w0HCGnZJJw",
        "XTXqTETkFcvTKnECSaxceTac",
        "XnV3JlnzpspxSOSbyZa3REef",
        "aNyda0BULTEfqhslHmJui3SO",
        "bythPGo24XUVDcIhMHrTDMIM",
        "cGPUTiq8TLvTb8Sv4OhylB5A",
        "dwHLbpTReWkxbkgJOaBZNxM7",
        "efXDwlavwHCFqSpSPKXwz7U4",
        "eoTJCQoG1SkEqQGA3XzbzEPT",
        "fRLrFH8Z3dnSBSJMm2dzTU40",
        "fT5EXhB7bsAZCZVqA3vk1WyU",
        "fuiTLzZ888Dp7xT2TAmhcEJs",
        "g29P9DkZn3kh0bNvqN2Tiey8",
        "g2ghvu55Lxkcrq072tQ49VRO",
        "gJM7Q4JgGFzbU8RXTEsLAT6Z",
        "gyuRW8HGXhy9uvQwyw1puRN8",
        "hwJkDdRMq9gBGw34fohEf8QZ",
        "i5PXtXKs4rGu1BDi0OggQEd8",
        "ieo8BDgISa7h1tLf5o75iQbX",
        "kTQT8FRMonaI0pV677545pI2",
        "mL8ogzbV0iAXfesmpg3xoO1o",
        "mbIRA5VVU71c3imE4BBuES0W",
        "moOFZo0Qkq7E1ML4s3nfGPKN",
        "mym9iQCvS0k0xoy1ZO9ayxID",
        "n2h4Zyh4JotHZZWE2TWq45gw",
        "nbItxAZbRdZ4WdrcTHQ2nEbe",
        "on7sHaQsaEhc3FV6FmSI4eLE",
        "ozWn358zmDBCBro4pBVeBIxy",
        "q2HQaGpRhWfPTskMx2SWBWXl",
        "q9iJKUKwgt8f57Tal4HPez0O",
        "qkrO4TZzlG291CVPu9fif30Q",
        "r8lAh2tlmunGCHOyPWJ5s933",
        "rMEyPLZT25CeVdE7kp6OvPXD",
        "sUr1rdIyTWqg5XNhOvJFxIB4",
        "sXwtEd3tKWF5Z29OeNlVTuEA",
        "saRM0bKX2mkziwZpbplA0Hdx",
        "tgtkm3pZGGe9RmLJEtk2rfPG",
        "tuLPFk3stzmiV9iZahf45qSa",
        "u9GInUOk6XPK6JdaZKz9eTud",
        "uAbOvr8BtRaddC7oPSLnbwBe",
        "uHdLHBAwl9caEQGtlNiFRG1o",
        "uL7SKPSyDSuk05PhBKQPML62",
        "vZAzKLtDAxS55KeKtp9minqJ",
        "w19iDoGWwlC6cMQsy43n0qGL",
        "wM7sEi3Dkl4b2OA9KUbsSl0R",
        "wuJH9fHI3E9yETXgSRWKJDB4",
        "xed7EKwKBnwDfbGAoxUEilkg",
        "y9CemNTq2z1n49R8MowTiRcZ",
        "yu0RX6EIqvh3l391GCMn8W1W",
        "z4s8bHVy7V06e6IIz48iUbJz",
    ]) {
        console.debug(`Trying to fix ${instance}...`)
        const data = []
        const now = Date.now()
        const future = now + getCryptWaitTime(map)
        for (const monster of AL.Game.G.maps[map].monsters) {
            if (monster.type !== "gpurplepro") continue
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
                killed: {
                    ggreenpro: 1,
                    gredpro: 1,
                    gbluepro: 1,
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
