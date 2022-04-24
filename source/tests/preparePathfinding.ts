import AL, { IPosition, Pathfinder } from "alclient"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const x = 126
    const y = -413
    console.log(`${x},${y}: ${Pathfinder.canStand({ map: "main", x: x, y: y })}`)
    for (const [dX, dY] of [[0, 0], [-10, 0], [10, 0], [0, -10], [0, 10], [-10, -10], [-10, 10], [10, -10], [10, 10]]) {
        const roundedX = Math.round((x + dX) / 10) * 10
        const roundedY = Math.round((y + dY) / 10) * 10
        console.log(`${roundedX},${roundedY}: ${Pathfinder.canStand({ map: "main", x: roundedX, y: roundedY })}`)
    }

    const closestTo = (position: IPosition) => {
        console.log(`Closest node to ${position.map}:${position.x},${position.y}`)
        console.log(Pathfinder.findClosestNode(position.map, position.x, position.y).id)
    }

    closestTo({ map: "main", x: -312, y: 150 })
    closestTo({ map: "main", x: -335, y: 159 })
    closestTo({ map: "arena", x: 200, y: -361 })
    closestTo({ map: "arena", x: 227, y: -390 })
    closestTo({ map: "arena", x: 564, y: -333 })
    closestTo({ map: "arena", x: 535, y: -358 })

    const now1 = performance.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "spookytown", x: 0, y: 0 })
    console.log(`Took ${performance.now() - now1}ms to perform the search from main to spookytown.`)


    const now2 = performance.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "main", x: -967, y: -169 })
    console.log(`Took ${performance.now() - now2}ms to perform the search from main to crab door.`)

    AL.Database.disconnect()
}
run()