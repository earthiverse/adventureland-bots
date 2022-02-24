import AL, { Character, Merchant, Priest, Rogue, ServerIdentifier, ServerRegion, Warrior } from "alclient"
import { addSocket, startServer } from "algui"
import { startMerchant, startPriest as startPratPriest, startWarrior as startPratWarrior } from "../prat/shared.js"
import { level1PratsNearDoor } from "../base/locations.js"
import { startDebugLoop, startTrackerLoop } from "../base/general.js"
import { startRogue as startSpiderRogue } from "../spiders/shared.js"

const region: ServerRegion = "US"
const identifier: ServerIdentifier = "I"
const merchant_ID = "earthMer"
const priest_ID = "earthPri"
const rogue_ID = "earthRog"
const warrior_ID = "earthWar"

let merchant: Merchant
let priest: Priest // prats
let rogue: Rogue // spiders
let warrior: Warrior // prats
const friends: Character[] = [undefined, undefined, undefined, undefined]

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start GUI
    startServer(80, AL.Game.G)

    // Start all characters
    console.log("Connecting...")

    const startMerchantLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) merchant.disconnect()
                merchant = await AL.Game.startMerchant(name, region, identifier)
                friends[0] = merchant
                startMerchant(merchant, friends, { map: "main", x: 0, y: -100 })
                addSocket(merchant.id, merchant.socket, merchant)
                startDebugLoop(merchant)
                merchant.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (merchant) merchant.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startMerchantLoop(merchant_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startWarriorLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (warrior) warrior.disconnect()
                warrior = await AL.Game.startWarrior(name, region, identifier)
                friends[1] = warrior
                startPratWarrior(warrior, merchant_ID, friends, "vhammer", "glolipop", level1PratsNearDoor)
                addSocket(warrior.id, warrior.socket, warrior)
                startTrackerLoop(warrior)
                startDebugLoop(warrior, true)
                warrior.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (warrior) warrior.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startWarriorLoop(warrior_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startPriestLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (priest) priest.disconnect()
                priest = await AL.Game.startPriest(name, region, identifier)
                friends[2] = priest
                startPratPriest(priest, merchant_ID, friends, level1PratsNearDoor)
                addSocket(priest.id, priest.socket, priest)
                startDebugLoop(priest)
                priest.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (priest) priest.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startPriestLoop(priest_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startRogueLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (rogue) rogue.disconnect()
                rogue = await AL.Game.startRogue(name, region, identifier)
                friends[3] = rogue
                startSpiderRogue(rogue, merchant_ID, friends)
                addSocket(rogue.id, rogue.socket, rogue)
                startDebugLoop(rogue)
                rogue.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (rogue) rogue.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startRogueLoop(rogue_ID, region, identifier).catch(() => { /* ignore errors */ })
}
run()