import axios from "axios"
import AL from "alclient-mongo"

const servers: [AL.ServerRegion, AL.ServerIdentifier][] = [
    ["ASIA", "I"],
    ["US", "I"],
    ["US", "II"],
    ["US", "III"],
    ["US", "PVP"],
    ["EU", "I"],
    ["EU", "II"],
    ["EU", "PVP"]
]

const SEND_ALDATA = false
const NOTABLE_NPCS: string[] = ["Angel", "Kane"]

const PEEK = true
const PEEK_MS = 40000
const PEEK_CHARS = ["earthMag", "earthMag2", "earthMag3", "earthRan2", "earthRan3", "earthRog", "earthRog2"]

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function run() {
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    for (const [region, identifier] of servers) {
        console.log(`Starting ${region} ${identifier} ALData logger`)
        const observer = await AL.Game.startObserver(region, identifier)

        if (SEND_ALDATA) {
            // Server Status
            observer.socket.on("server_info", async (data: AL.ServerData) => {
                const statuses = Object.keys(data).filter(k => { typeof data[k] === "object" }).map(e => {
                    data[e].eventname = e
                    data[e].server_region = region
                    data[e].server_identifier = identifier

                    return data[e]
                })

                axios.post("https://aldata.info/api/serverstatuses", statuses, { headers: { "Content-Type": "application/json" } })
            })

            // NPCs
            observer.socket.on("new_map", async (data: AL.NewMapData) => {
                // Help out super in his data gathering
                const npcInfos = []
                data.entities
                for (const npc of NOTABLE_NPCS) {
                    for (const player of data.entities.players) {
                        if (npc == player.id) {
                            npcInfos.push({
                                server_region: region,
                                server_identifier: identifier,
                                map: data.name,
                                x: player.going_x,
                                y: player.going_y,
                                name: npc
                            })
                        }
                    }
                }

                if (npcInfos.length > 0) {
                    axios.post("https://aldata.info/api/npcinfos", npcInfos, { headers: { "Content-Type": "application/json" } })
                }
            })
        }
    }

    if (PEEK) {
        // Look for `skeletor`
        const skeletorCheck = async () => {
            const character = PEEK_CHARS[0]
            if (!character) return
            for (const [region, identifier] of servers) {
                if (identifier == "PVP") continue // Don't peek PVP
                try {
                    await sleep(PEEK_MS)
                    console.log(`Checking for skeletor on ${region} ${identifier}...`)
                    const bot = await AL.Game.startCharacter(character, region, identifier)
                    if (bot.rip) await bot.respawn()
                    await Promise.all([bot.smartMove({ map: "arena", x: 379.5, y: -671.5 }).catch(() => { /* Suppress Errors */ }), bot.regenHP()])
                    await bot.disconnect()
                } catch (e) {
                    console.log(e)
                }
            }
            skeletorCheck()
        }
        skeletorCheck()

        // Look for `mvampire` in place #1
        const mvampireCheck1 = async () => {
            const character = PEEK_CHARS[1]
            if (!character) return
            for (const [region, identifier] of servers) {
                if (identifier == "PVP") continue // Don't peek PVP
                try {
                    await sleep(PEEK_MS)
                    console.log(`Checking for mvampire (1) on ${region} ${identifier}...`)
                    const bot = await AL.Game.startCharacter(character, region, identifier)
                    if (bot.rip) await bot.respawn()
                    await Promise.all([bot.smartMove({ map: "cave", x: -190.5, y: -1176.5 }).catch(() => { /* Suppress Errors */ }), bot.regenHP()])
                    await bot.disconnect()
                } catch (e) {
                    console.log(e)
                }
            }
            mvampireCheck1()
        }
        mvampireCheck1()

        // Look for `mvampire` in place #2
        const mvampireCheck2 = async () => {
            const character = PEEK_CHARS[2]
            if (!character) return
            for (const [region, identifier] of servers) {
                if (identifier == "PVP") continue // Don't peek PVP
                try {
                    await sleep(PEEK_MS)
                    console.log(`Checking for mvampire (2) on ${region} ${identifier}...`)
                    const bot = await AL.Game.startCharacter(character, region, identifier)
                    if (bot.rip) await bot.respawn()
                    await Promise.all([bot.smartMove({ map: "cave", x: 1244, y: -22.5 }).catch(() => { /* Suppress Errors */ }), bot.regenHP()])
                    await bot.disconnect()
                } catch (e) {
                    console.log(e)
                }
            }
            mvampireCheck2()
        }
        mvampireCheck2()

        await sleep(PEEK_MS)
        // Look for `fvampire`
        const fvampireCheck = async () => {
            const character = PEEK_CHARS[3]
            if (!character) return
            for (const [region, identifier] of servers) {
                if (identifier == "PVP") continue // Don't peek PVP
                try {
                    await sleep(PEEK_MS)
                    console.log(`Checking for fvampire on ${region} ${identifier}...`)
                    const bot = await AL.Game.startCharacter(character, region, identifier)
                    if (bot.rip) await bot.respawn()
                    await Promise.all([bot.smartMove({ map: "halloween", x: -405.5, y: -1642.5 }).catch(() => { /* Suppress Errors */ }), bot.regenHP()])
                    await bot.disconnect()
                } catch (e) {
                    console.log(e)
                }
            }
            fvampireCheck()
        }
        fvampireCheck()

        // Look for `greenjr`
        const greenjrCheck = async () => {
            const character = PEEK_CHARS[4]
            if (!character) return
            for (const [region, identifier] of servers) {
                if (identifier == "PVP") continue // Don't peek PVP
                try {
                    await sleep(PEEK_MS)
                    console.log(`Checking for greenjr on ${region} ${identifier}...`)
                    const bot = await AL.Game.startCharacter(character, region, identifier)
                    if (bot.rip) await bot.respawn()
                    await Promise.all([bot.smartMove({ map: "halloween", x: -569, y: -511.5 }).catch(() => { /* Suppress Errors */ }), bot.regenHP()])
                    await bot.disconnect()
                } catch (e) {
                    console.log(e)
                }
            }
            greenjrCheck()
        }
        greenjrCheck()

        // Look for `jr`
        const jrCheck = async () => {
            const character = PEEK_CHARS[5]
            if (!character) return
            for (const [region, identifier] of servers) {
                if (identifier == "PVP") continue // Don't peek PVP
                try {
                    await sleep(PEEK_MS)
                    console.log(`Checking for jr on ${region} ${identifier}...`)
                    const bot = await AL.Game.startCharacter(character, region, identifier)
                    if (bot.rip) await bot.respawn()
                    await Promise.all([bot.smartMove({ map: "spookytown", x: -783.5, y: -301 }).catch(() => { /* Suppress Errors */ }), bot.regenHP()])
                    await bot.disconnect()
                } catch (e) {
                    console.log(e)
                }
            }
            jrCheck()
        }
        jrCheck()

        await sleep(PEEK_MS)
        // Look for `jr`
        const stompyCheck = async () => {
            const character = PEEK_CHARS[6]
            if (!character) return
            for (const [region, identifier] of servers) {
                if (identifier == "PVP") continue // Don't peek PVP
                try {
                    await sleep(PEEK_MS)
                    console.log(`Checking for stompy on ${region} ${identifier}...`)
                    const bot = await AL.Game.startCharacter(character, region, identifier)
                    if (bot.rip) await bot.respawn()
                    await Promise.all([bot.smartMove({ map: "winterland", x: 433, y: -2745 }).catch(() => { /* Suppress Errors */ }), bot.regenHP()])
                    await bot.disconnect()
                } catch (e) {
                    console.log(e)
                }
            }
            stompyCheck()
        }
        stompyCheck()
    }
}
run()