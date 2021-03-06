import { ServerIdentifier, ServerRegion } from "./definitions/adventureland.js"
import { Game } from "./Game.js"
import { Pathfinder } from "./Pathfinder.js"

const servers: [ServerRegion, ServerIdentifier][] = [
    ["ASIA", "I"],
    ["US", "I"],
    ["US", "II"],
    ["US", "III"],
    ["US", "PVP"],
    ["EU", "I"],
    ["EU", "II"],
    ["EU", "PVP"]
]
const timeout = 40000

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function start() {
    // Login
    await Promise.all([Game.loginJSONFile("../credentials.json"), Pathfinder.prepare()])

    // Start observers on all servers
    for (const [region, identifier] of servers) {
        await Game.startObserver(region, identifier)
    }

    // Look for `skeletor`
    const skeletorCheck = async () => {
        const character = "earthMag"
        for (const [region, identifier] of servers) {
            try {
                await sleep(timeout)
                console.log(`Checking for skeletor on ${region} ${identifier}...`)
                const bot = await Game.startCharacter(character, region, identifier)
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                await Promise.all([bot.smartMove({ map: "arena", x: 379.5, y: -671.5 }).catch(() => { }), bot.regenHP()])
                await Game.stopCharacter(character)
            } catch (e) {
                console.log(e)
            }
        }
        skeletorCheck()
    }
    skeletorCheck()

    // Look for `mvampire` in place #1
    const mvampireCheck1 = async () => {
        const character = "earthMag2"
        for (const [region, identifier] of servers) {
            try {
                await sleep(timeout)
                console.log(`Checking for mvampire (1) on ${region} ${identifier}...`)
                const bot = await Game.startCharacter(character, region, identifier)
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                await Promise.all([bot.smartMove({ map: "cave", x: -190.5, y: -1176.5 }).catch(() => { }), bot.regenHP()])
                await Game.stopCharacter(character)
            } catch (e) {
                console.log(e)
            }
        }
        mvampireCheck1()
    }
    mvampireCheck1()

    // Look for `mvampire` in place #2
    const mvampireCheck2 = async () => {
        const character = "earthMag3"
        for (const [region, identifier] of servers) {
            try {
                await sleep(timeout)
                console.log(`Checking for mvampire (2) on ${region} ${identifier}...`)
                const bot = await Game.startCharacter(character, region, identifier)
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                await Promise.all([bot.smartMove({ map: "cave", x: 1244, y: -22.5 }).catch(() => { }), bot.regenHP()])
                await Game.stopCharacter(character)
            } catch (e) {
                console.log(e)
            }
        }
        mvampireCheck2()
    }
    mvampireCheck2()

    // Look for `fvampire`
    const fvampireCheck = async () => {
        const character = "earthRog"
        for (const [region, identifier] of servers) {
            try {
                await sleep(timeout)
                console.log(`Checking for fvampire on ${region} ${identifier}...`)
                const bot = await Game.startCharacter(character, region, identifier)
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                await Promise.all([bot.smartMove({ map: "halloween", x: -405.5, y: -1642.5 }).catch(() => { }), bot.regenHP()])
                await Game.stopCharacter(character)
            } catch (e) {
                console.log(e)
            }
        }
        fvampireCheck()
    }
    fvampireCheck()

    // Look for `greenjr`
    const greenjrCheck = async () => {
        const character = "earthRog2"
        for (const [region, identifier] of servers) {
            try {
                await sleep(timeout)
                console.log(`Checking for greenjr on ${region} ${identifier}...`)
                const bot = await Game.startCharacter(character, region, identifier)
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                await Promise.all([bot.smartMove({ map: "halloween", x: -569, y: -511.5 }).catch(() => { }), bot.regenHP()])
                await Game.stopCharacter(character)
            } catch (e) {
                console.log(e)
            }
        }
        greenjrCheck()
    }
    greenjrCheck()

    // Look for `jr`
    const jrCheck = async () => {
        const character = "earthRan2"
        for (const [region, identifier] of servers) {
            try {
                await sleep(timeout)
                console.log(`Checking for jr on ${region} ${identifier}...`)
                const bot = await Game.startCharacter(character, region, identifier)
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                await Promise.all([bot.smartMove({ map: "spookytown", x: -783.5, y: -301 }).catch(() => { }), bot.regenHP()])
                await Game.stopCharacter(character)
            } catch (e) {
                console.log(e)
            }
        }
        jrCheck()
    }
    jrCheck()
}

start()