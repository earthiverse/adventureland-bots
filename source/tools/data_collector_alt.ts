import AL, { Character } from "alclient"
import { getHalloweenMonsterPriority } from "../base/serverhop.js"

const PEEK_CHARS = ["attackMag", "attackMag2"]

async function run() {
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Look for `greenjr` in place #1
    let greenjrChecker: Character
    const start_greenjrCheck = async () => {
        try {
            const botName = PEEK_CHARS[0]
            if (!botName) return
            const server = (await getHalloweenMonsterPriority())[0]
            if (server) {
                console.log(`Checking for greenjr on ${server.serverRegion} ${server.serverIdentifier}...`)
                greenjrChecker = await AL.Game.startCharacter(botName, server.serverRegion, server.serverIdentifier)

                if (greenjrChecker.rip) await greenjrChecker.respawn()
                await Promise.all([greenjrChecker.smartMove({ map: "halloween", x: -569, y: -511.5 }).catch(console.error), greenjrChecker.regenHP()])
                greenjrChecker.disconnect()
                greenjrChecker = undefined
                AL.PlayerModel.updateOne({ name: botName }, { lastSeen: Date.now() - 60_000 }).exec().catch((e) => { console.error(e) })
            }
        } catch (e) {
            console.error(e)
            if (greenjrChecker) greenjrChecker.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(start_greenjrCheck, msToNextMinute + 5000)
    }
    const stop_greenjrCheck = async () => {
        try {
            if (greenjrChecker) greenjrChecker.disconnect()
            greenjrChecker = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(stop_greenjrCheck, msToNextMinute - 5000 < 0 ? msToNextMinute + 55_000 : msToNextMinute - 5000)
    }
    let msToNextMinute = 60_000 - (Date.now() % 60_000)
    setTimeout(start_greenjrCheck, msToNextMinute + 5000)
    setTimeout(stop_greenjrCheck, msToNextMinute - 5000 < 0 ? msToNextMinute + 55_000 : msToNextMinute - 5000)

    // Look for `jr` in place #1
    let jrChecker: Character
    const start_jrCheck = async () => {
        try {
            const botName = PEEK_CHARS[1]
            if (!botName) return
            const server = (await getHalloweenMonsterPriority())[0]
            if (server) {
                console.log(`Checking for jr on ${server.serverRegion} ${server.serverIdentifier}...`)
                jrChecker = await AL.Game.startCharacter(botName, server.serverRegion, server.serverIdentifier)

                if (jrChecker.rip) await jrChecker.respawn()
                await Promise.all([jrChecker.smartMove({ map: "spookytown", x: -783.5, y: -301 }).catch(console.error), jrChecker.regenHP()])
                jrChecker.disconnect()
                jrChecker = undefined
                AL.PlayerModel.updateOne({ name: botName }, { lastSeen: Date.now() - 60_000 }).exec().catch((e) => { console.error(e) })
            }
        } catch (e) {
            console.error(e)
            if (jrChecker) jrChecker.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(start_jrCheck, msToNextMinute + 5000)
    }
    const stop_jrCheck = async () => {
        try {
            if (jrChecker) jrChecker.disconnect()
            jrChecker = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(stop_jrCheck, msToNextMinute - 5000 < 0 ? msToNextMinute + 55_000 : msToNextMinute - 5000)
    }
    msToNextMinute = 60_000 - (Date.now() % 60_000)
    setTimeout(start_jrCheck, msToNextMinute + 5000)
    setTimeout(stop_jrCheck, msToNextMinute - 5000 < 0 ? msToNextMinute + 55_000 : msToNextMinute - 5000)
}
run()