import AL, { IPosition, Pathfinder } from "alclient"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.getGData(true)])
    const now1 = performance.now()
    await AL.Pathfinder.prepare(AL.Game.G)
    console.log(`Took ${performance.now() - now1}ms to prepare pathfinding.`)

    const closestTo = (position: IPosition) => {
        console.log(`Closest node to ${position.map}:${position.x},${position.y}`)
        const node = Pathfinder.findClosestNode(position.map, position.x, position.y)
        const iPosition = `{ map: "${node.data.map}", x: ${node.data.x}, y: ${node.data.y} }`
        console.log(`  ${iPosition}`)
        return iPosition
    }

    console.log("Looking for cheat path...")
    const from = closestTo({ map: "spookytown", x: 104, y: 1257 })
    const to = closestTo({ map: "spookytown", x: 152, y: 1224 })
    console.log("Cheat Path: ")
    console.log(`  addCheatPath(${from}, ${to})`)

    console.log(Pathfinder.locateMonster("harpy"))

    const now2 = performance.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "spookytown", x: 0, y: 0 })
    console.log(`Took ${performance.now() - now2}ms to perform the search from main to spookytown.`)

    const now3 = performance.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "main", x: -967, y: -169 })
    console.log(`Took ${performance.now() - now3}ms to perform the search from main to crab door.`)

    // AL.Database.disconnect()
}
run().catch(console.error)