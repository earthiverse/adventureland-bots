import AL, { IPosition, Rogue, ServerIdentifier, ServerRegion } from "alclient"
import fs from "fs"
import { getMsToNextMinute } from "../base/general.js"
import { Strategist } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { NewBuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { AlwaysInvisStrategy } from "../strategy_pattern/strategies/invis.js"
import { HoldPositionMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"

// Login, prepare, and get game data
await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
await Promise.all([AL.Pathfinder.prepare(AL.Game.G, { cheat: true }), AL.Game.updateServersAndCharacters()])

const BUFFER = 15_000

const credentials = JSON.parse(fs.readFileSync("../../credentials_attack.json", "utf-8"))

const baseStrategy = new BaseStrategy()
const buyStrategy = new NewBuyStrategy({
    itemConfig: {},
    enableBuyForProfit: true
})
const invisStrategy = new AlwaysInvisStrategy()
const respawnStrategy = new RespawnStrategy()

async function startWatch(userId: string, userAuth: string, characterID: string, location: IPosition, targetRegion: ServerRegion, targetIdentifier: ServerIdentifier) {
    let bot: Rogue
    try {
        bot = new AL.Rogue(userId, userAuth, characterID, AL.Game.G, AL.Game.servers[targetRegion][targetIdentifier])
        await bot.connect()
    } catch (e) {
        console.error(`${characterID} had an error (start) on ${targetRegion}${targetIdentifier}`)
        console.error(e)
        setTimeout(startWatch, getMsToNextMinute() + BUFFER, userId, userAuth, characterID, location, targetRegion, targetIdentifier)
        return
    }

    const context: Strategist<Rogue> = new Strategist<Rogue>(bot, baseStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(invisStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(new HoldPositionMoveStrategy(location))

    const serverLoop = async () => {
        if (targetRegion == "US") {
            if (targetIdentifier == "I") targetIdentifier = "III"
            else if (targetIdentifier == "II") targetIdentifier = "III"
            else if (targetIdentifier == "III") targetIdentifier = "PVP"
            else {
                targetRegion = "EU"
                targetIdentifier = "I"
            }
        } else if (targetRegion == "EU") {
            if (targetIdentifier == "I") targetIdentifier = "II"
            else if (targetIdentifier == "II") targetIdentifier = "PVP"
            else {
                targetRegion = "ASIA"
                targetIdentifier = "I"
            }
        } else {
            targetRegion = "US"
            targetIdentifier = "I"
        }
        setTimeout(serverLoop, getMsToNextMinute())
    }
    serverLoop()

    const connectLoop = async () => {
        try {
            console.log(`Connecting to ${targetRegion} ${targetIdentifier}...`)
            await context.changeServer(targetRegion, targetIdentifier)
        } catch (e) {
            console.error(`${characterID} had an error (connect) on ${targetRegion}${targetIdentifier}`)
            console.error(e)
        } finally {
            context?.bot?.socket?.removeAllListeners("disconnect")
            setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + BUFFER)
        }
    }
    setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + BUFFER)

    const disconnectLoop = async () => {
        try {
            console.log("Disconnecting...")

            context.bot.socket.removeAllListeners("disconnect")
            await context.bot.disconnect()
        } catch (e) {
            console.error(`${characterID} had an error (disconnect) on ${targetRegion}${targetIdentifier}`)
            console.error(e)
        } finally {
            setTimeout(async () => { await disconnectLoop() }, getMsToNextMinute() + (60_000 - BUFFER))
        }
    }
    setTimeout(async () => { await disconnectLoop() }, getMsToNextMinute() - BUFFER)
}

// // 1 - Skeletor
// setTimeout(startWatch, getMsToNextMinute() + BUFFER, credentials1.userID, credentials1.userAuth, "4991719061323776", { map: "arena", x: 379.5, y: -671.5 }, "US", "I")
// // 2 - Male Vampire (1)
// setTimeout(startWatch, getMsToNextMinute() + BUFFER, credentials1.userID, credentials1.userAuth, "4947108980850688", { map: "cave", x: -190.5, y: -1176.5 }, "US", "I")
// // 3 - Male Vampire (2)
// setTimeout(startWatch, getMsToNextMinute() + BUFFER, credentials1.userID, credentials1.userAuth, "5761400101666816", { map: "cave", x: 1244, y: -22.5 }, "US", "I")

// // 4 - Female Vampire
// setTimeout(startWatch, getMsToNextMinute() + BUFFER, credentials2.userID, credentials2.userAuth, "5775099889713152", { map: "halloween", x: -405.5, y: -1642.5 }, "EU", "I")
// // 5 - Green Jr.
// setTimeout(startWatch, getMsToNextMinute() + BUFFER, credentials2.userID, credentials2.userAuth, "5917875541377024", { map: "halloween", x: -569, y: -511.5 }, "EU", "I")
// // 6 - Jr.
// setTimeout(startWatch, getMsToNextMinute() + BUFFER, credentials2.userID, credentials2.userAuth, "5189659356823552", { map: "spookytown", x: -783.5, y: -301 }, "EU", "I")

// // 7 - Stompy
// setTimeout(startWatch, getMsToNextMinute() + BUFFER, credentials3.userID, credentials3.userAuth, "4706865690181632", { map: "winterland", x: 433, y: -2745 }, "ASIA", "I")
// 8 - Goos (New Players)
setTimeout(startWatch, getMsToNextMinute() + BUFFER, credentials.userID, credentials.userAuth, "5742582347333632", { map: "main", x: -32, y: 787 }, "ASIA", "I")
// 9 - Town (Ponty)
setTimeout(startWatch, getMsToNextMinute() + BUFFER, credentials.userID, credentials.userAuth, "6430657581940736", { map: "main", x: -0, y: 0 }, "ASIA", "I")
