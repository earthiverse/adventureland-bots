import { LinkData } from "./definitions/pathfinder.js"
import { Game, PingCompensatedPlayer } from "./game.js"
import { Pathfinder } from "./pathfinder.js"

async function moveLoop(bot: PingCompensatedPlayer, moves: LinkData[]) {
    try {
        for (let i = 0; i < moves.length; i++) {
            const currentMove = moves[i]

            // TODO: Optimize to move to the last in the list we can move to
            for (let j = moves.length - 1; j > i; j--) {
                const potentialMove = moves[j]
                if (potentialMove.type !== "move") continue
            }
            if (currentMove.type == "leave") {
                await bot.leaveMap()
            } else if (currentMove.type == "move") {
                await bot.move(currentMove.x, currentMove.y)
            } else if (currentMove.type == "town") {
                await bot.warpToTown()
            } else if (currentMove.type == "transport") {
                await bot.transport(currentMove.map, currentMove.spawn)
            }
        }
    } catch(e) {
        console.error(e)
    }
}

async function run() {
    const login = Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpasswordlol")
    const pathfinder = Pathfinder.prepare()

    await login
    await pathfinder

    // TODO: Get a path from A to B.
    let now = Date.now()
    await Pathfinder.getPath({ map: "main", x: 10, y: 10 }, { map: "main", x: -74, y: 1904 })
    console.log(`Pathfinding took ${Date.now() - now}ms`)
    now = Date.now()
    await Pathfinder.getPath({ map: "main", x: -74, y: 1904 }, { map: "main", x: 10, y: 10 })
    console.log(`Pathfinding took ${Date.now() - now}ms`)
    now = Date.now()
    await Pathfinder.getPath({ map: "main", x: 10, y: 10 }, { map: "main", x: 1600, y: -500 })
    console.log(`Pathfinding took ${Date.now() - now}ms`)
    now = Date.now()
    await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "spookytown", x: 175, y: -1060 })
    console.log(`Pathfinding took ${Date.now() - now}ms`)

    const bot = await Game.startCharacter("earthiverse", "ASIA", "I")

    bot.socket.on("player", (data) => {
        console.log("----- player -----")
        console.log(data)
    })

    await moveLoop(bot, await Pathfinder.getPath(bot.character, { map: "spookytown", x: 175, y: -1060 }))

    Game.disconnect()
}

run()