import AL, { Character, Mage, Ranger, ServerIdentifier, ServerRegion } from "alclient"
import { MY_CHARACTERS } from "../base/general.js"
import { getTargetServerFromPlayer, getTargetServerFromDate } from "../base/serverhop.js"
import { startMage as startCrocMage } from "../crocs/shared.js"
import { startRanger as startJratRanger } from "../jrats/shared.js"

// let jrat_lastServer: [ServerRegion, ServerIdentifier] = ["US", "II"]
// const jrat_ID = "earthiverse"
// let jrat: Ranger

const croc_server: [ServerRegion, ServerIdentifier] = ["EU", "PVP"]
const croc1_ID = "earthMag"
const croc2_ID = "earthMag2"
const croc3_ID = "earthMag3"
let croc1: Mage
let croc2: Mage
let croc3: Mage

const friends: Character[] = [undefined, undefined, undefined, undefined]

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")

    // const jratConnectLoop = async () => {
    //     try {
    //         const avoidServer = await getTargetServerFromPlayer(jrat_lastServer[0], jrat_lastServer[1], "earthWar")
    //         const targetServer = getTargetServerFromDate(0, true)
    //         if (targetServer[0] !== avoidServer[0] || targetServer[1] !== avoidServer[1]) jrat_lastServer = targetServer

    //         jrat = await AL.Game.startRanger(jrat_ID, jrat_lastServer[0], jrat_lastServer[1])
    //         friends[0] = jrat
    //         startJratRanger(jrat, "earthMer", friends, "firebow", "quiver")
    //     } catch (e) {
    //         console.error(e)
    //         if (jrat) jrat.disconnect()
    //     }
    //     const msToNextMinuteJrat = 60_000 - (Date.now() % 60_000)
    //     setTimeout(async () => { jratConnectLoop() }, msToNextMinuteJrat + 5000)
    // }

    // const jratDisconnectLoop = async () => {
    //     try {
    //         if (jrat) jrat.disconnect()
    //         jrat = undefined
    //     } catch (e) {
    //         console.error(e)
    //     }
    //     const msToNextMinuteJrat = 60_000 - (Date.now() % 60_000)
    //     setTimeout(async () => { jratDisconnectLoop() }, msToNextMinuteJrat - 5000 < 0 ? msToNextMinuteJrat + 55_000 : msToNextMinuteJrat - 5000)
    // }

    // const msToNextMinuteJrat = 60_000 - (Date.now() % 60_000)
    // setTimeout(async () => { jratConnectLoop() }, msToNextMinuteJrat + 5000)
    // setTimeout(async () => { jratDisconnectLoop() }, msToNextMinuteJrat - 5000 < 0 ? msToNextMinuteJrat + 55_000 : msToNextMinuteJrat - 5000)

    const croc1ConnectLoop = async () => {
        try {
            croc1 = await AL.Game.startMage(croc1_ID, croc_server[0], croc_server[1])
            friends[1] = croc1
            startCrocMage(croc1, "earthMer", friends, croc1_ID, MY_CHARACTERS)
        } catch (e) {
            console.error(e)
            if (croc1) croc1.disconnect()
        }
        const msToNextMinuteCroc1 = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { croc1ConnectLoop() }, msToNextMinuteCroc1 + 5000)
    }

    const croc1DisconnectLoop = async () => {
        try {
            if (croc1) croc1.disconnect()
            croc1 = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinuteCroc1 = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { croc1DisconnectLoop() }, msToNextMinuteCroc1 - 5000 < 0 ? msToNextMinuteCroc1 + 55_000 : msToNextMinuteCroc1 - 5000)
    }

    const msToNextMinuteCroc1 = 60_000 - (Date.now() % 60_000)
    setTimeout(async () => { croc1ConnectLoop() }, msToNextMinuteCroc1 + 5000)
    setTimeout(async () => { croc1DisconnectLoop() }, msToNextMinuteCroc1 - 5000 < 0 ? msToNextMinuteCroc1 + 55_000 : msToNextMinuteCroc1 - 5000)

    const croc2ConnectLoop = async () => {
        try {
            croc2 = await AL.Game.startMage(croc2_ID, croc_server[0], croc_server[1])
            friends[2] = croc2
            startCrocMage(croc2, "earthMer", friends, croc1_ID, MY_CHARACTERS)
        } catch (e) {
            console.error(e)
            if (croc2) croc2.disconnect()
        }
        const msToNextMinuteCroc2 = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { croc2ConnectLoop() }, msToNextMinuteCroc2 + 5000)
    }

    const croc2DisconnectLoop = async () => {
        try {
            if (croc2) croc2.disconnect()
            croc2 = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinuteCroc2 = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { croc2DisconnectLoop() }, msToNextMinuteCroc2 - 5000 < 0 ? msToNextMinuteCroc2 + 55_000 : msToNextMinuteCroc2 - 5000)
    }

    const msToNextMinuteCroc2 = 60_000 - (Date.now() % 60_000)
    setTimeout(async () => { croc2ConnectLoop() }, msToNextMinuteCroc2 + 5000)
    setTimeout(async () => { croc2DisconnectLoop() }, msToNextMinuteCroc2 - 5000 < 0 ? msToNextMinuteCroc2 + 55_000 : msToNextMinuteCroc2 - 5000)

    const croc3ConnectLoop = async () => {
        try {
            croc3 = await AL.Game.startMage(croc3_ID, croc_server[0], croc_server[1])
            friends[3] = croc3
            startCrocMage(croc3, "earthMer", friends, croc1_ID, MY_CHARACTERS)
        } catch (e) {
            console.error(e)
            if (croc3) croc3.disconnect()
        }
        const msToNextMinuteCroc3 = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { croc3ConnectLoop() }, msToNextMinuteCroc3 + 5000)
    }

    const croc3DisconnectLoop = async () => {
        try {
            if (croc3) croc3.disconnect()
            croc3 = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinuteCroc3 = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { croc3DisconnectLoop() }, msToNextMinuteCroc3 - 5000 < 0 ? msToNextMinuteCroc3 + 55_000 : msToNextMinuteCroc3 - 5000)
    }

    const msToNextMinuteCroc3 = 60_000 - (Date.now() % 60_000)
    setTimeout(async () => { croc3ConnectLoop() }, msToNextMinuteCroc3 + 5000)
    setTimeout(async () => { croc3DisconnectLoop() }, msToNextMinuteCroc3 - 5000 < 0 ? msToNextMinuteCroc3 + 55_000 : msToNextMinuteCroc3 - 5000)

}
run()