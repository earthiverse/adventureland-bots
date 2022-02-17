import AL, { Character, Mage, Merchant, ServerIdentifier, ServerRegion } from "alclient"
import { startTrackerLoop } from "../base/general.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { startMage as startPoisioMage } from "../poisios/shared.js"
import { startMerchant } from "../prat/shared.js"

const region: ServerRegion = "US"
const identifier: ServerIdentifier = "I"
const mage1_ID = "facilitating"
const mage2_ID = "gratuitously"
const mage3_ID = "hypothesized"
const merchant_ID = "decisiveness"

let mage1: Mage // poisio
let mage2: Mage // poisio
let mage3: Mage // poisio
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

    const startMage1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage1) mage1.disconnect()
                mage1 = await AL.Game.startMage(name, region, identifier)
                friends[1] = mage1
                startPoisioMage(mage1, merchant_ID, friends, partyLeader, partyMembers)
                startTrackerLoop(mage1)
                mage1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage1) mage1.disconnect()
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
    startMage1Loop(mage1_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startMage2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage2) mage2.disconnect()
                mage2 = await AL.Game.startMage(name, region, identifier)
                friends[2] = mage2
                startPoisioMage(mage2, merchant_ID, friends, partyLeader, partyMembers)
                mage2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage2) mage2.disconnect()
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
    startMage2Loop(mage2_ID, region, identifier).catch(() => { /* ignore errors */ })

    const startMage3Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage3) mage3.disconnect()
                mage3 = await AL.Game.startMage(name, region, identifier)
                friends[3] = mage3
                startPoisioMage(mage3, merchant_ID, friends, partyLeader, partyMembers)
                mage3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage3) mage3.disconnect()
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
    startMage3Loop(mage3_ID, region, identifier).catch(() => { /* ignore errors */ })
}
run()