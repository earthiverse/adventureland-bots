// import * as ALPathfinder from "alpathfinder"
import AL from "alclient"
import { sleep } from "../base/general.js"

async function run() {
    console.log("Logging in, etc...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    console.log(`Version is: ${AL.Game.G.version}.`)

    console.log("Preparing pathfinding...")
    // ALPathfinder.prepare(AL.Game.G)

    console.log("Awaiting something idk...")
    await sleep(100)
}
run()