import AL, { Character, Mage, Merchant, ServerIdentifier, ServerRegion, Warrior } from "alclient"
import { startTrackerLoop } from "../base/general.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { startMage as startFrogMage } from "../frogs/shared.js"
import { startWarrior as startBBPomPomWarrior } from "../bbpompom/shared.js"
import { startMerchant } from "../prat/shared.js"

const region: ServerRegion = "US"
const identifier: ServerIdentifier = "I"
const char1_ID = "facilitating"
const char2_ID = "announcement"
const char3_ID = "battleworthy"
const merchant_ID = "decisiveness"

let char1: Mage // frogs / tortoises
let char2: Warrior // bbpompoms
let char3: Warrior // bbpompoms
let merchant: Merchant // merchant
const friends: Character[] = [undefined, undefined, undefined, undefined]

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
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
                startMerchant(merchant, friends, { map: "main", x: -25, y: -100 })
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

    const startChar1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (char1) char1.disconnect()
                char1 = await AL.Game.startMage(name, region, identifier)
                friends[1] = char1
                startFrogMage(char1, merchant_ID, friends, partyLeader, partyMembers)
                startTrackerLoop(char1)
                char1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (char1) char1.disconnect()
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
    startChar1Loop(char1_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startChar2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (char2) char2.disconnect()
                char2 = await AL.Game.startWarrior(name, region, identifier)
                friends[2] = char2
                startBBPomPomWarrior(char2, merchant_ID, friends, partyLeader, partyMembers)
                char2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (char2) char2.disconnect()
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
    startChar2Loop(char2_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startChar3Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (char3) char3.disconnect()
                char3 = await AL.Game.startWarrior(name, region, identifier)
                friends[3] = char3
                startBBPomPomWarrior(char3, merchant_ID, friends, partyLeader, partyMembers)
                char3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (char3) char3.disconnect()
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
    startChar3Loop(char3_ID, region, identifier).catch(() => { /* ignore errors */ })
}
run()