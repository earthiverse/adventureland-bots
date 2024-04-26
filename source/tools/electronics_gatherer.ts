import AL, { Rogue, ServerIdentifier, ServerRegion } from "alclient"
import { getMsToNextMinute } from "../base/general.js"
import { Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { ItemStrategy } from "../strategy_pattern/strategies/item.js"
import { DEFAULT_ITEM_CONFIG } from "../base/itemsNew.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { DestroyStrategy } from "../strategy_pattern/strategies/destroy.js"
import { HoldPositionMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { SellStrategy } from "../strategy_pattern/strategies/sell.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

const BUFFER = 27_500
const ROGUE_NAME = "earthRog"
const CONTEXTS: Strategist<Rogue>[] = []

const BASE_STRATEGY = new BaseStrategy()
const ITEM_STRATEGY = new ItemStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const BUY_STRATEGY = new BuyStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const SELL_STRATEGY = new SellStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const RESPAWN_STRATEGY = new RespawnStrategy()
const DESTROY_STRATEGY = new DestroyStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const FROG_MOVE_STRATEGY = new HoldPositionMoveStrategy({ map: "cyberland", x: 0, y: 0 })

export class ElectronicsStrategy implements Strategy<Rogue> {
    public onApply(bot: Rogue) {
        bot.socket.emit("eval", { command: "give spares" })
    }
}
const ELECTRONICS_STRATEGY = new ElectronicsStrategy()

let nextDefaultRegion: ServerRegion
let nextDefaultIdentifier: ServerIdentifier
function getNextDefaultServer() {
    if (nextDefaultRegion == "US") {
        if (nextDefaultIdentifier == "I") nextDefaultIdentifier = "II"
        else if (nextDefaultIdentifier == "II") nextDefaultIdentifier = "III"
        else if (nextDefaultIdentifier == "III") nextDefaultIdentifier = "PVP"
        else {
            nextDefaultRegion = "EU"
            nextDefaultIdentifier = "I"
        }
    } else if (nextDefaultRegion == "EU") {
        if (nextDefaultIdentifier == "I") nextDefaultIdentifier = "II"
        else if (nextDefaultIdentifier == "II") nextDefaultIdentifier = "PVP"
        else {
            nextDefaultRegion = "ASIA"
            nextDefaultIdentifier = "I"
        }
    } else {
        nextDefaultRegion = "US"
        nextDefaultIdentifier = "I"
    }
    return { serverRegion: nextDefaultRegion, serverIdentifier: nextDefaultIdentifier }
}

async function start(serverRegion: ServerRegion, serverIdentifier: ServerIdentifier) {
    // Set up the next check for deals
    setTimeout(getNextServer, getMsToNextMinute() + BUFFER)

    // Set up the emergency check
    setTimeout(emergencyStop, getMsToNextMinute() - Math.min(5000, BUFFER / 2)

    // Set up the disconnect for the next server hop
    setTimeout(() => {
        console.log("Stopping!")
        for (const context of CONTEXTS) context.stop()
    }, getMsToNextMinute() - BUFFER)

    CONTEXTS.splice(0, CONTEXTS.length)

    const rogue = await AL.Game.startRogue(ROGUE_NAME, serverRegion, serverIdentifier)
    const context = new Strategist<Rogue>(rogue, BASE_STRATEGY)
    context.applyStrategy(ITEM_STRATEGY)
    context.applyStrategy(BUY_STRATEGY)
    context.applyStrategy(SELL_STRATEGY)
    context.applyStrategy(RESPAWN_STRATEGY)
    context.applyStrategy(DESTROY_STRATEGY)
    context.applyStrategy(FROG_MOVE_STRATEGY)
    context.applyStrategy(ELECTRONICS_STRATEGY)

    CONTEXTS.push(context)
}

async function getNextServer() {
    // Check what server our characters are on, and avoid those servers
    await AL.Game.updateServersAndCharacters()
    const online = new Set<string>()
    for (const charName in AL.Game.characters) {
        const charData = AL.Game.characters[charName]
        if (!charData.online) continue // Not online
        online.add(charData.server)
    }
    const avoidServers = [...online]
        // Return a formatted list of servers to not check
        .map((v) => {
            const server = /(US|EU|ASIA)([MDCLXVI]+|PVP)/.exec(v)
            const serverRegion: ServerRegion = server[1] as ServerRegion
            const serverIdentifier: ServerIdentifier = server[2] as ServerIdentifier
            return { serverRegion: serverRegion, serverIdentifier: serverIdentifier }
        })
    if (avoidServers.length === 0)
        // Use a non-existent server so Mongo doesn't yell at us for avoidServers being empty
        avoidServers.push({ serverRegion: "ASIA", serverIdentifier: "III" })

    for (let i = 0; i < 5; i++) {
        const nextServer = getNextDefaultServer()
        if (
            avoidServers.some(
                (v) => v.serverRegion == nextServer.serverRegion && v.serverIdentifier == nextServer.serverIdentifier,
            )
        ) {
            // We want to avoid this server
            continue
        }
        console.log(`Going to ${nextServer.serverRegion}${nextServer.serverIdentifier} to see what's what!`)
        start(nextServer.serverRegion, nextServer.serverIdentifier)
        return
    }

    console.log("Not going anywhere for now...")
    setTimeout(getNextServer, getMsToNextMinute() + BUFFER)
    return
}
setTimeout(getNextServer, getMsToNextMinute() + BUFFER)

async function emergencyStop() {
    // Update who's online
    await AL.Game.updateServersAndCharacters()
    let numOnline = 0
    for (const charName in AL.Game.characters) {
        const charData = AL.Game.characters[charName]
        if (charData.online) numOnline++
        if (numOnline > 4) {
            console.error("Too many characters online!")
            process.exit(99)
        }
    }
}
