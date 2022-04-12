import AL, { GMap } from "alclient"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    for (const map in AL.Game.G.maps) {
        const gMap = AL.Game.G.maps[map] as GMap
        if (gMap.ignore) continue

        let i = 0
        for (const door of gMap.doors) {
            const x = door[0]
            const y = door[1]
            const width = door[2]
            const height = door[3]

            console.debug(`Door ${i} on ${map} is size ${width}x${height}, located at (${x},${y}).`)

            i += 1
        }
    }

    AL.Database.disconnect()
}
run()