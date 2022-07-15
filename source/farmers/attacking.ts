import AL, { Character, Merchant, Priest, Ranger, ServerIdentifier, ServerRegion } from "alclient"
import { startTrackerLoop } from "../base/general.js"
import { startPriest as startSnakePriest, startRanger as startSnakeRanger } from "../snakes/shared.js"
import { startMerchant } from "../prat/shared.js"

const region: ServerRegion = "US"
const identifier: ServerIdentifier = "II"
const ranger_ID = "attackRan2"
const priest1_ID = "attackPri2"
const priest2_ID = "attackPri3"
const merchant_ID = "attackMer"

const partyLeader = ranger_ID
const partyMembers = [ranger_ID, priest1_ID, priest2_ID]

let ranger: Ranger
let priest1: Priest
let priest2: Priest
let merchant: Merchant // merchant
const friends: Character[] = [undefined, undefined, undefined, undefined]

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

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
                merchant.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (merchant) merchant.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startMerchantLoop(merchant_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startRangerLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (ranger) ranger.disconnect()
                ranger = await AL.Game.startRanger(name, region, identifier)
                friends[1] = ranger
                startSnakeRanger(ranger, merchant_ID, friends, partyLeader, partyMembers)
                startTrackerLoop(ranger)
                ranger.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (ranger) ranger.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startRangerLoop(ranger_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startPriest1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (priest1) priest1.disconnect()
                priest1 = await AL.Game.startPriest(name, region, identifier)
                friends[2] = priest1
                startSnakePriest(priest1, merchant_ID, friends, partyLeader, partyMembers)
                priest1.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (priest1) priest1.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startPriest1Loop(priest1_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startPriest2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (priest2) priest2.disconnect()
                priest2 = await AL.Game.startPriest(name, region, identifier)
                friends[3] = priest2
                startSnakePriest(priest2, merchant_ID, friends, partyLeader, partyMembers)
                priest2.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (priest2) priest2.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startPriest2Loop(priest2_ID, region, identifier).catch(() => { /* ignore errors */ })
}
run()