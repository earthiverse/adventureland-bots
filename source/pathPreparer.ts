import AL from "alclient"
import { NodeData } from "alclient/build/definitions/pathfinder"

function moveDebug(from: NodeData, to: NodeData) {
    console.log(`Finding path from (${from.map},${from.x},${from.y}) to (${to.map},${to.x},${to.y})`)
    const start = Date.now()
    const closestSpawn = AL.Pathfinder.findClosestSpawn(from.map, from.x, from.y)
    const closestNodeFrom = AL.Pathfinder.findClosestNode(from.map, from.x, from.y)
    const closestNodeTo = AL.Pathfinder.findClosestNode(to.map, to.x, to.y)
    const path = AL.Pathfinder.getPath(from, to)
    const finish = Date.now()

    console.log(`Computed the following path in ${finish - start}ms`)
    console.log(closestSpawn)
    console.log(closestNodeFrom.data)
    console.log(closestNodeTo.data)
    console.log(path)
    console.log("--------------------------------------------------------------------------------")
    return path
}

AL.Game.loginJSONFile("../credentials.json").then(async () => {
    console.log("Preparing pathfinding...")
    await AL.Pathfinder.prepare()

    // console.log("Finding path from 'main' to 'spookytown'")
    // let start = Date.now()
    // let path = AL.Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "spookytown", x: 0, y: 0 })
    // console.log(`Computed path in ${Date.now() - start}ms`)

    // console.log("Finding path from 'spookytown' to 'main'")
    // start = Date.now()
    // path = AL.Pathfinder.getPath({ map: "spookytown", x: 0, y: 0 }, { map: "main", x: 0, y: 0 })
    // console.log(`Computed path in ${Date.now() - start}ms`)

    // console.log("Finding path from 'winterland' to 'main'")
    // start = Date.now()
    // path = AL.Pathfinder.getPath({ map: "winterland", x: 0, y: 0 }, { map: "main", x: 0, y: 0 })
    // console.log(`Computed path in ${Date.now() - start}ms`)

    // The following gives me errors walking through walls, we're going to try and fix it
    let path = moveDebug({ map: "arena", x: 0, y: -500 }, { map: "arena", x: 283, y: -148 })
    console.log(AL.Pathfinder.canWalkPath(path[0], path[1]))

    path = moveDebug({ map: "winter_cave", x: 0, y: -50 }, { map: "main", x: -55, y: -472 })
})