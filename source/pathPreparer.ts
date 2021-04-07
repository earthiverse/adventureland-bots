import AL from "alclient"
import { NodeData } from "alclient/build/definitions/pathfinder"
import { performance } from "perf_hooks"

function moveDebug(from: NodeData, to: NodeData) {
    console.log(`Finding path from (${from.map},${from.x},${from.y}) to (${to.map},${to.x},${to.y})`)
    const start = performance.now()
    const closestSpawn = AL.Pathfinder.findClosestSpawn(from.map, from.x, from.y)
    const closestNodeFrom = AL.Pathfinder.findClosestNode(from.map, from.x, from.y)
    const closestNodeTo = AL.Pathfinder.findClosestNode(to.map, to.x, to.y)
    const start2 = performance.now()
    const path = AL.Pathfinder.getPath(from, to)
    const finish = performance.now()

    console.log(`Computed the following in ${finish - start}ms (path only: ${finish - start2}ms)`)
    console.log("Closest spawn:")
    console.log(closestSpawn)
    console.log("Closest node (from):")
    console.log(closestNodeFrom.data)
    console.log("Closest node (to):")
    console.log(closestNodeTo.data)
    console.log("Path:")
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

    path = moveDebug({ map: "jail", x: 0, y: 0 }, { map: "spookytown", x: 369, y: 250.5 })

    path = moveDebug({map: "main", x: 0, y: 0 }, {map: "main", x: 10, y: 10})

    // crab to crabx
    path = moveDebug({map: "main", x: -1202.5, y: -66}, {map: "main", x: -984, y: 1762})

    // main to crabx
    path = moveDebug({map: "main", x: 0, y: 0}, {map: "main", x: -984, y: 1762})

    // crabx to main
    path = moveDebug({map: "main", x: -984, y: 1762}, {map: "main", x: 0, y: 0})

    // scorpion to crabx
    path = moveDebug({map: "main", x: 1577.5, y: -168}, {map: "main", x: -984, y: 1762})
})