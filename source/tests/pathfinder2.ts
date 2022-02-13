// import * as ALPathfinderWASM from "alpathfinder"
import AL from "alclient"
// import { sleep } from "../base/general.js"

async function run() {
    console.log("Logging in, etc...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    console.log(`Version is: ${AL.Game.G.version}.`)

    console.log("Preparing pathfinding...")
    // try {
    //     ALPathfinderWASM.prepare(AL.Game.G)

    //     console.log("Awaiting something idk...")
    //     await sleep(100)

    //     console.log("Hello?")
    //     const isWalkable = ALPathfinderWASM.is_walkable("main", 0, 0)
    //     console.log(`${isWalkable} vs. ${AL.Pathfinder.canStand({ map: "main", x: 0, y: 0 })}`)
    //     // const getValue = ALPathfinderWASM.get_value("main", 0, 0)
    //     // console.log(getValue)


    //     const isWalkable2 = ALPathfinderWASM.is_walkable("main", -1608, 464)
    //     console.log(`${isWalkable2} vs. ${AL.Pathfinder.canStand({ map: "main", x: -1608, y: 464 })}`)
    //     // const getValue2 = ALPathfinderWASM.get_value("main", -1608, 464)
    //     // console.log(getValue2)
    // } catch (e) {
    //     console.error(e)
    // }
    // console.log("Wow, it handles errors OK...")
}
run()