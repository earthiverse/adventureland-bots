import AL from "alclient-mongo"
import { identifier, topBoundary, topPositions, region, startShared, targets } from "./runners.js"

/** Config */
const follower1Name = "facilitating"
const follower2Name = "gratuitously"
const follower3Name = "hypothesized"

/** Characters */
let follower1: AL.Mage
let follower2: AL.Mage
let follower3: AL.Mage

const friends: AL.Mage[] = [follower3, follower1, follower2]

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const startFollower1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower1) await follower1.disconnect()
                follower1 = await AL.Game.startMage(name, region, identifier)
                friends[0] = follower1
                startShared(follower1, targets, topBoundary, topPositions[0], friends)
                follower1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (follower1) await follower1.disconnect()
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
    startFollower1Loop(follower1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startFollower2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower2) await follower2.disconnect()
                follower2 = await AL.Game.startMage(name, region, identifier)
                friends[1] = follower2
                startShared(follower2, targets, topBoundary, topPositions[2], friends)
                follower2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (follower2) await follower2.disconnect()
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
    startFollower2Loop(follower2Name, region, identifier).catch(() => { /* ignore errors */ })

    const startFollower3Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower3) await follower3.disconnect()
                follower3 = await AL.Game.startMage(name, region, identifier)
                friends[2] = follower3
                startShared(follower3, targets, topBoundary, topPositions[1], friends)
                follower3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (follower3) await follower3.disconnect()
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
    startFollower3Loop(follower3Name, region, identifier).catch(() => { /* ignore errors */ })
}
run()