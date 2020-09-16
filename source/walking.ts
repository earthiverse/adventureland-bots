import { Game } from "./game.js"
import { Pathfinder } from "./pathfinder.js"

async function run() {
    const login = Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpasswordlol")
    const pathfinder = Pathfinder.prepare()

    await login
    await pathfinder

    // TODO: Get a path from A to B.
    let now = Date.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "main", x: -74, y: 1904 })
    console.log(`Pathfinding took ${Date.now() - now}ms`)
    now = Date.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "main", x: 1600, y: -500 })
    console.log(`Pathfinding took ${Date.now() - now}ms`)
    now = Date.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "spookytown", x: 175, y: -1060 })
    console.log(`Pathfinding took ${Date.now() - now}ms`)

    Game.disconnect()
}

run()