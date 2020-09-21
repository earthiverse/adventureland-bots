import { LinkData } from "./definitions/pathfinder.js"
import { Game, PingCompensatedPlayer } from "./game.js"
import { Pathfinder } from "./pathfinder.js"

async function moveLoop(bot: PingCompensatedPlayer, moves: LinkData[]) {
    try {
        if (bot.socket.disconnected) return
        
        for (let i = 0; i < moves.length; i++) {
            console.log(`Currently at ${bot.character.map},${bot.character.x},${bot.character.y}`)
            const currentMove = moves[i]

            // TODO: Optimize to move to the last in the list we can move to
            // for (let j = moves.length - 1; j > i; j--) {
            //     const potentialMove = moves[j]
            //     if (potentialMove.type !== "move") continue
            // }
            if (currentMove.type == "leave") {
                console.log(`  Wanting to leave ${bot.character.map}`)
                await bot.leaveMap()
            } else if (currentMove.type == "move") {
                console.log(`  Wanting to move to ${currentMove.x},${currentMove.y}`)
                await bot.move(currentMove.x, currentMove.y)
            } else if (currentMove.type == "town") {
                console.log("  Wanting to warp to 'town'")
                await bot.warpToTown()
            } else if (currentMove.type == "transport") {
                console.log(`  Wanting to transport to ${currentMove.map} (spawn: ${currentMove.spawn})`)
                await bot.transport(currentMove.map, currentMove.spawn)
            }
        }
    } catch (e) {
        console.error(e)
    }
}

async function healLoop(bot: PingCompensatedPlayer) {
    try {
        if (bot.socket.disconnected) return

        const missingHP = bot.character.max_hp - bot.character.hp
        const missingMP = bot.character.max_mp - bot.character.mp
        const hpRatio = bot.character.hp / bot.character.max_hp
        const mpRatio = bot.character.mp / bot.character.max_mp
        const hpot1 = bot.locateItem("hpot1")
        const mpot1 = bot.locateItem("mpot1")
        if (hpRatio < mpRatio) {
            if (missingHP >= 400 && hpot1) {
                await bot.useHPPot(hpot1)
            } else {
                await bot.regenHP()
            }
        } else if (mpRatio < hpRatio) {
            if (missingMP >= 500 && mpot1) {
                await bot.useMPPot(mpot1)
            } else {
                await bot.regenMP()
            }
        } else if (hpRatio < 1) {
            if (missingHP >= 400 && hpot1) {
                await bot.useHPPot(hpot1)
            } else {
                await bot.regenHP()
            }
        }
    } catch (e) {
        //console.error(e)
    }

    setTimeout(async () => { healLoop(bot) }, Math.max(bot.getCooldown("use_hp"), 10))
}

async function run() {
    const login = Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpasswordlol")
    const pathfinder = Pathfinder.prepare()

    await login
    await pathfinder

    // let now = Date.now()
    // await Pathfinder.getPath({ map: "main", x: 10, y: 10 }, { map: "main", x: -74, y: 1904 })
    // console.log(`Pathfinding took ${Date.now() - now}ms`)
    // now = Date.now()
    // await Pathfinder.getPath({ map: "main", x: -74, y: 1904 }, { map: "main", x: 10, y: 10 })
    // console.log(`Pathfinding took ${Date.now() - now}ms`)
    // now = Date.now()
    // await Pathfinder.getPath({ map: "main", x: 10, y: 10 }, { map: "main", x: 1600, y: -500 })
    // console.log(`Pathfinding took ${Date.now() - now}ms`)
    // now = Date.now()
    // await Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "spookytown", x: 175, y: -1060 })
    // console.log(`Pathfinding took ${Date.now() - now}ms`)

    const bot = await Game.startCharacter("earthMer", "ASIA", "I")
    healLoop(bot)

    // eslint-disable-next-line no-constant-condition
    while(true) {
        let path: LinkData[]
        path = await Pathfinder.getPath(bot.character, { map: "main", x: -74, y: 1904 })
        console.log(path)
        await moveLoop(bot, path)
        path = await Pathfinder.getPath(bot.character, { map: "main", x: 0, y: 0 })
        console.log(path)
        await moveLoop(bot, path)
        path = await Pathfinder.getPath(bot.character, { map: "main", x: 1600, y: -500 })
        console.log(path)
        await moveLoop(bot, path)
    }

    console.log(bot.character)

    Game.disconnect()
}

run()