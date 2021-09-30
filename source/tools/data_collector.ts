import axios from "axios"
import AL from "alclient"
import { getTargetServerFromDate, SERVER_HOP_SERVERS } from "../base/serverhop.js"

const servers = SERVER_HOP_SERVERS

const SEND_ALDATA = false
const NOTABLE_NPCS: string[] = ["Angel", "Kane"]

const PEEK = true
const PEEK_CHARS = ["earthRan2", "earthRan3", "earthMag2", "earthWar2", "earthWar3", "earthRog", "earthRog2", "earthPal"]

async function run() {
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    if (PEEK) await AL.Pathfinder.prepare(AL.Game.G)

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
        let skeletorChecker: AL.Character
        const start_skeletorCheck = async () => {
            try {
                const botName = PEEK_CHARS[0]
                if (!botName) return
                const server = getTargetServerFromDate(1, true)
                console.log(`Checking for skeletor on ${server[0]} ${server[1]}...`)
                skeletorChecker = await AL.Game.startCharacter(botName, server[0], server[1])

                if (skeletorChecker.rip) await skeletorChecker.respawn()
                await Promise.all([skeletorChecker.smartMove({ map: "arena", x: 379.5, y: -671.5 }).catch(() => { /* Suppress Errors */ }), skeletorChecker.regenHP()])
                await skeletorChecker.disconnect()
                skeletorChecker = undefined
            } catch (e) {
                console.error(e)
                if (skeletorChecker) skeletorChecker.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { start_skeletorCheck() }, msToNextMinute + 10000)
        }
        const stop_skeletorCheck = async () => {
            try {
                if (skeletorChecker) await skeletorChecker.disconnect()
                skeletorChecker = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { stop_skeletorCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
        }
        let msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { start_skeletorCheck() }, msToNextMinute + 10000)
        setTimeout(async () => { stop_skeletorCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)

        // Look for `mvampire` in place #1
        let mvampireChecker: AL.Character
        const start_mvampireCheck = async () => {
            try {
                const botName = PEEK_CHARS[1]
                if (!botName) return
                const server = getTargetServerFromDate(1, true)
                console.log(`Checking for mvampire on ${server[0]} ${server[1]}...`)
                mvampireChecker = await AL.Game.startCharacter(botName, server[0], server[1])

                if (mvampireChecker.rip) await mvampireChecker.respawn()
                await Promise.all([mvampireChecker.smartMove({ map: "cave", x: -190.5, y: -1176.5 }).catch(() => { /* Suppress Errors */ }), mvampireChecker.regenHP()])
                await mvampireChecker.disconnect()
                mvampireChecker = undefined
            } catch (e) {
                console.error(e)
                if (mvampireChecker) mvampireChecker.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { start_mvampireCheck() }, msToNextMinute + 10000)
        }
        const stop_mvampireCheck = async () => {
            try {
                if (mvampireChecker) await mvampireChecker.disconnect()
                mvampireChecker = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { stop_mvampireCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
        }
        msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { start_mvampireCheck() }, msToNextMinute + 10000)
        setTimeout(async () => { stop_mvampireCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)

        // Look for `mvampire` in place #2
        let mvampireChecker2: AL.Character
        const start_mvampireCheck2 = async () => {
            try {
                const botName = PEEK_CHARS[2]
                if (!botName) return
                const server = getTargetServerFromDate(1, true)
                console.log(`Checking for mvampire on ${server[0]} ${server[1]}...`)
                mvampireChecker2 = await AL.Game.startCharacter(botName, server[0], server[1])

                if (mvampireChecker2.rip) await mvampireChecker2.respawn()
                await Promise.all([mvampireChecker2.smartMove({ map: "cave", x: 1244, y: -22.5 }).catch(() => { /* Suppress Errors */ }), mvampireChecker2.regenHP()])
                await mvampireChecker2.disconnect()
                mvampireChecker2 = undefined
            } catch (e) {
                console.error(e)
                if (mvampireChecker2) mvampireChecker2.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { start_mvampireCheck2() }, msToNextMinute + 10000)
        }
        const stop_mvampireCheck2 = async () => {
            try {
                if (mvampireChecker2) await mvampireChecker2.disconnect()
                mvampireChecker2 = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { stop_mvampireCheck2() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
        }
        msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { start_mvampireCheck2() }, msToNextMinute + 10000)
        setTimeout(async () => { stop_mvampireCheck2() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)

        // Look for `fvampire` in place #1
        let fvampireChecker: AL.Character
        const start_fvampireCheck = async () => {
            try {
                const botName = PEEK_CHARS[3]
                if (!botName) return
                const server = getTargetServerFromDate(2, true)
                console.log(`Checking for fvampire on ${server[0]} ${server[1]}...`)
                fvampireChecker = await AL.Game.startCharacter(botName, server[0], server[1])

                if (fvampireChecker.rip) await fvampireChecker.respawn()
                await Promise.all([fvampireChecker.smartMove({ map: "halloween", x: -405.5, y: -1642.5 }).catch(() => { /* Suppress Errors */ }), fvampireChecker.regenHP()])
                await fvampireChecker.disconnect()
                fvampireChecker = undefined
            } catch (e) {
                console.error(e)
                if (fvampireChecker) fvampireChecker.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { start_fvampireCheck() }, msToNextMinute + 10000)
        }
        const stop_fvampireCheck = async () => {
            try {
                if (fvampireChecker) await fvampireChecker.disconnect()
                fvampireChecker = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { stop_fvampireCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
        }
        msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { start_fvampireCheck() }, msToNextMinute + 10000)
        setTimeout(async () => { stop_fvampireCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)

        // Look for `greenjr` in place #1
        let greenjrChecker: AL.Character
        const start_greenjrCheck = async () => {
            try {
                const botName = PEEK_CHARS[4]
                if (!botName) return
                const server = getTargetServerFromDate(2, true)
                console.log(`Checking for greenjr on ${server[0]} ${server[1]}...`)
                greenjrChecker = await AL.Game.startCharacter(botName, server[0], server[1])

                if (greenjrChecker.rip) await greenjrChecker.respawn()
                await Promise.all([greenjrChecker.smartMove({ map: "halloween", x: -569, y: -511.5 }).catch(() => { /* Suppress Errors */ }), greenjrChecker.regenHP()])
                await greenjrChecker.disconnect()
                greenjrChecker = undefined
            } catch (e) {
                console.error(e)
                if (greenjrChecker) greenjrChecker.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { start_greenjrCheck() }, msToNextMinute + 10000)
        }
        const stop_greenjrCheck = async () => {
            try {
                if (greenjrChecker) await greenjrChecker.disconnect()
                greenjrChecker = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { stop_greenjrCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
        }
        msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { start_greenjrCheck() }, msToNextMinute + 10000)
        setTimeout(async () => { stop_greenjrCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)

        // Look for `jr` in place #1
        let jrChecker: AL.Character
        const start_jrCheck = async () => {
            try {
                const botName = PEEK_CHARS[5]
                if (!botName) return
                const server = getTargetServerFromDate(2, true)
                console.log(`Checking for jr on ${server[0]} ${server[1]}...`)
                jrChecker = await AL.Game.startCharacter(botName, server[0], server[1])

                if (jrChecker.rip) await jrChecker.respawn()
                await Promise.all([jrChecker.smartMove({ map: "spookytown", x: -783.5, y: -301 }).catch(() => { /* Suppress Errors */ }), jrChecker.regenHP()])
                await jrChecker.disconnect()
                jrChecker = undefined
            } catch (e) {
                console.error(e)
                if (jrChecker) jrChecker.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { start_jrCheck() }, msToNextMinute + 10000)
        }
        const stop_jrCheck = async () => {
            try {
                if (jrChecker) await jrChecker.disconnect()
                jrChecker = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { stop_jrCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
        }
        msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { start_jrCheck() }, msToNextMinute + 10000)
        setTimeout(async () => { stop_jrCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)

        // Look for `stompy` in place #1
        let stompyChecker: AL.Character
        const start_stompyCheck = async () => {
            try {
                const botName = PEEK_CHARS[6]
                if (!botName) return
                const server = getTargetServerFromDate(3, true)
                console.log(`Checking for stompy on ${server[0]} ${server[1]}...`)
                stompyChecker = await AL.Game.startCharacter(botName, server[0], server[1])

                if (stompyChecker.rip) await stompyChecker.respawn()
                await Promise.all([stompyChecker.smartMove({ map: "winterland", x: 433, y: -2745 }).catch(() => { /* Suppress Errors */ }), stompyChecker.regenHP()])
                await stompyChecker.disconnect()
                stompyChecker = undefined
            } catch (e) {
                console.error(e)
                if (stompyChecker) stompyChecker.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { start_stompyCheck() }, msToNextMinute + 10000)
        }
        const stop_stompyCheck = async () => {
            try {
                if (stompyChecker) await stompyChecker.disconnect()
                stompyChecker = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { stop_stompyCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
        }
        msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { start_stompyCheck() }, msToNextMinute + 10000)
        setTimeout(async () => { stop_stompyCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)

        // Look for `newPlayers` in place #1
        let newPlayersChecker: AL.Character
        const start_newPlayersCheck = async () => {
            try {
                const botName = PEEK_CHARS[7]
                if (!botName) return
                const server = getTargetServerFromDate(3, true)
                console.log(`Checking for newPlayers on ${server[0]} ${server[1]}...`)
                newPlayersChecker = await AL.Game.startCharacter(botName, server[0], server[1])

                if (newPlayersChecker.rip) await newPlayersChecker.respawn()
                await Promise.all([newPlayersChecker.smartMove({ map: "main", x: -32, y: 787 }).catch(() => { /* Suppress Errors */ }), newPlayersChecker.regenHP()])
                await newPlayersChecker.disconnect()
                newPlayersChecker = undefined
            } catch (e) {
                console.error(e)
                if (newPlayersChecker) newPlayersChecker.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { start_newPlayersCheck() }, msToNextMinute + 10000)
        }
        const stop_newPlayersCheck = async () => {
            try {
                if (newPlayersChecker) await newPlayersChecker.disconnect()
                newPlayersChecker = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { stop_newPlayersCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
        }
        msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { start_newPlayersCheck() }, msToNextMinute + 10000)
        setTimeout(async () => { stop_newPlayersCheck() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
    }
}
run()