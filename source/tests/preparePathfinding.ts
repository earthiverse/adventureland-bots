import AL, { IPosition, Pathfinder } from "alclient"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    const now1 = performance.now()
    await AL.Pathfinder.prepare(AL.Game.G)
    console.log(`Took ${performance.now() - now1}ms to prepare pathfinding.`)

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

    console.log("----- points 1 -----")
    closestTo({ map: "winter_cove", x: -616, y: -359 })
    closestTo({ map: "winter_cove", x: -720, y: -376 })

    console.log("----- points 2 -----")
    closestTo({ map: "winter_cove", x: -527, y: -1374 })
    closestTo({ map: "winter_cove", x: -576, y: -1471 })

    console.log("----- points 3 -----")
    closestTo({ map: "winter_cove", x: -431, y: -1727 })
    closestTo({ map: "winter_cove", x: -496, y: -1808 })

    console.log("----- points 4 -----")
    closestTo({ map: "winter_cove", x: -48, y: -1983 })
    closestTo({ map: "winter_cove", x: -144, y: -1952 })

    console.log("----- points 5 -----")
    closestTo({ map: "winter_cove", x: 33, y: -2047 })
    closestTo({ map: "winter_cove", x: 32, y: -2159 })

    console.log("----- points 6 -----")
    closestTo({ map: "winter_cove", x: 640, y: -344 })
    closestTo({ map: "winter_cove", x: 575, y: -263 })

    console.log("----- points 7-1 -----")
    closestTo({ map: "winter_cove", x: -296, y: -904 })
    closestTo({ map: "winter_cove", x: -328, y: -807 })

    console.log("----- points 7-2 -----")
    closestTo({ map: "winter_cove", x: -176, y: -903 })
    closestTo({ map: "winter_cove", x: -240, y: -935 })

    console.log("----- points 8-1 -----")
    closestTo({ map: "winter_cove", x: 16, y: -1031 })
    closestTo({ map: "winter_cove", x: 64, y: -1104 })

    console.log("----- points 8-2 / 9-1 -----")
    closestTo({ map: "winter_cove", x: 96, y: -1168 })
    closestTo({ map: "winter_cove", x: 176, y: -1200 })

    console.log("----- points 9-2 -----")
    closestTo({ map: "winter_cove", x: 257, y: -1199 })
    closestTo({ map: "winter_cove", x: 337, y: -1208 })

    console.log("----- points 9-3 / 10-1 -----")
    closestTo({ map: "winter_cove", x: 160, y: -1247 })
    closestTo({ map: "winter_cove", x: 80, y: -1312 })

    console.log("----- points 10-2 / 11-2 -----")
    closestTo({ map: "winter_cove", x: -31, y: -1343 })
    closestTo({ map: "winter_cove", x: -48, y: -1351 })

    console.log("----- points 11-1 -----")
    closestTo({ map: "winter_cove", x: -248, y: -1367 })
    closestTo({ map: "winter_cove", x: -295, y: -1375 })

    console.log("----- points 12-1 -----")
    closestTo({ map: "winter_cove", x: 320, y: -1752 })
    closestTo({ map: "winter_cove", x: 296, y: -1800 })

    console.log("----- points 12-2 -----")
    closestTo({ map: "winter_cove", x: 185, y: -1880 })
    closestTo({ map: "winter_cove", x: 128, y: -1952 })

    // console.log(Pathfinder.locateMonster("goo"))

    // console.log(Pathfinder.canWalkPath({
    //     map: "winterland",
    //     x: 633.5863705515645,
    //     y: 43.07499775832615
    // },
    // {
    //     map: "winterland",
    //     x: 867.5648224081189,
    //     y: -89.23400075771264
    // }))

    const now2 = performance.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "spookytown", x: 0, y: 0 })
    console.log(`Took ${performance.now() - now2}ms to perform the search from main to spookytown.`)

    const now3 = performance.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "main", x: -967, y: -169 })
    console.log(`Took ${performance.now() - now3}ms to perform the search from main to crab door.`)

    AL.Database.disconnect()
}
run().catch(console.error)