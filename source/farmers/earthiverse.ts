import AL, { Character, Merchant, Priest, Ranger, ServerIdentifier, ServerRegion, Warrior } from "alclient"
import { addSocket, startServer } from "algui"
import { startPriest as startBigBirdPriest, startWarrior as startBigBirdWarrior } from "../bigbird/shared.js"
import { startTrackerLoop } from "../base/general.js"
import { startRanger as startBoarRanger } from "../boars/shared.js"
import { startMerchant } from "../prat/shared.js"

const region: ServerRegion = "US"
const identifier: ServerIdentifier = "I"
const merchant_ID = "earthMer"
const priest_ID = "earthPri"
const ranger_ID = "earthiverse"
const warrior_ID = "earthWar"

let merchant: Merchant
let priest: Priest // bigbirds
let ranger: Ranger // boars
let warrior: Warrior // bigbirds
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
                startTrackerLoop(merchant)
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
                startBigBirdWarrior(warrior, merchant_ID, friends, "vhammer", "glolipop")
                addSocket(warrior.id, warrior.socket, warrior)
                startTrackerLoop(warrior)
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
                startBigBirdPriest(priest, merchant_ID, friends)
                addSocket(priest.id, priest.socket, priest)
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

    const startRangerLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (ranger) ranger.disconnect()
                ranger = await AL.Game.startRanger(name, region, identifier)
                friends[3] = ranger
                startBoarRanger(ranger, merchant_ID, friends)
                addSocket(ranger.id, ranger.socket, ranger)
                ranger.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (ranger) ranger.disconnect()
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
    startRangerLoop(ranger_ID, region, identifier).catch(() => { /* ignore errors */ })
}
run()