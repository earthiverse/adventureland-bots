import AL from "alclient"
import { getItemsToCompoundOrUpgrade } from "../base/items.js"
import { startDebugLoop, writeLast1000Events } from "../archive/base/general.js"

async function run() {
    console.log("Logging in, etc...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const earthMer2 = await AL.Game.startMerchant("earthMer", "ASIA", "I")
    startDebugLoop(earthMer2)

    try {
        const okay = await getItemsToCompoundOrUpgrade(earthMer2)
        console.log(okay)

        earthMer2.disconnect()
        AL.Database.disconnect()
    } catch (e) {
        console.error(e)
        writeLast1000Events(earthMer2, "banking_debug.txt", "banking stuff")

        earthMer2.disconnect()
        AL.Database.disconnect()
    }
}

run()