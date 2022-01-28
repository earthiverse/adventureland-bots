import AL, { Pathfinder } from "alclient"

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

    AL.Database.disconnect()
}
run()