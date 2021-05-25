import AL from "alclient-mongo"
import { goToNPCShopIfFull, goToPoitonSellerIfLow, LOOP_MS } from "./base/general.js"

const target: AL.MonsterName = "goo"
const defaultLocation: AL.IPosition = { map: "main", x: -32, y: 787 } // goos
let bot: AL.Character

async function startShared(bot: AL.Character) {
    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (bot.canUse("attack")) {
                for (const [, entity] of bot.entities) {
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far away
                    if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                    if (entity.willBurnToDeath()) continue // Will burn to death shortly

                    await bot.basicAttack(entity.id)

                    // Move to the next entity if we're gonna kill it
                    if (bot.canKillInOneShot(entity)) {
                        let closest: AL.Entity
                        let distance = Number.MAX_VALUE
                        for (const [, entity] of bot.entities) {
                            if (entity.type !== target) continue // Only attack our target
                            if (!AL.Pathfinder.canWalkPath(bot, entity)) continue // Can't simply walk to entity
                            if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                            if (entity.willBurnToDeath()) continue // Will burn to death shortly

                            const d = AL.Tools.distance(bot, entity)
                            if (d < distance) {
                                closest = entity
                                distance = d
                            }
                        }

                        if (closest && AL.Tools.distance(bot, closest) > bot.range) {
                            bot.smartMove(closest, { getWithin: bot.range / 2 }).catch(() => { /* suppress warnings */ })
                        }
                    }
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    async function healLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (!bot.rip) {
                const missingHP = bot.max_hp - bot.hp
                const missingMP = bot.max_mp - bot.mp
                const hpRatio = bot.hp / bot.max_hp
                const mpRatio = bot.mp / bot.max_mp
                const hpot1 = bot.locateItem("hpot1")
                const hpot0 = bot.locateItem("hpot0")
                const mpot1 = bot.locateItem("mpot1")
                const mpot0 = bot.locateItem("mpot0")
                if (hpRatio < mpRatio) {
                    if (bot.c.town) {
                        await bot.regenHP()
                    } else if (missingHP >= 400 && hpot1 !== undefined) {
                        await bot.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await bot.useHPPot(hpot0)
                    } else {
                        await bot.regenHP()
                    }
                } else if (mpRatio < hpRatio) {
                    if (bot.c.town) {
                        await bot.regenHP()
                    } else if (missingMP >= 500 && mpot1 !== undefined) {
                        await bot.useMPPot(mpot1)
                    } else if (missingMP >= 300 && mpot0 !== undefined) {
                        await bot.useMPPot(mpot0)
                    } else {
                        await bot.regenMP()
                    }
                } else if (hpRatio < 1) {
                    if (bot.c.town) {
                        await bot.regenHP()
                    } else if (missingHP >= 400 && hpot1 !== undefined) {
                        await bot.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await bot.useHPPot(hpot0)
                    } else {
                        await bot.regenHP()
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("healloop", setTimeout(async () => { healLoop() }, Math.max(LOOP_MS, bot.getCooldown("use_hp"))))
    }
    healLoop()

    async function lootLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            for (const [, chest] of bot.chests) {
                if (AL.Tools.distance(bot, chest) > 800) continue
                await bot.openChest(chest.id)
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("lootloop", setTimeout(async () => { lootLoop() }, LOOP_MS))
    }
    lootLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            await goToPoitonSellerIfLow(bot)
            await goToNPCShopIfFull(bot)

            let closest: AL.Entity
            let distance = Number.MAX_VALUE
            for (const [, entity] of bot.entities) {
                if (entity.type !== target) continue // Only attack our target
                if (!AL.Pathfinder.canWalkPath(bot, entity)) continue // Can't simply walk to entity
                if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                if (entity.willBurnToDeath()) continue // Will burn to death shortly

                const d = AL.Tools.distance(bot, entity)
                if (d < distance) {
                    closest = entity
                    distance = d
                }
            }

            if (!closest) {
                if (AL.Tools.distance(bot, defaultLocation) > 1) await bot.smartMove(defaultLocation)
            } else if (AL.Tools.distance(bot, closest) > bot.range) {
                bot.smartMove(closest, { getWithin: bot.range / 2 }).catch(() => { /* suppress warnings */ })
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Game.getGData()])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")

    const startBot = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (bot) await bot.disconnect()
                bot = await AL.Game.startCharacter(name, region, identifier)
                startShared(bot)
                bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (bot) await bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if(wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if(/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startBot("earthPal", "US", "I").catch(() => { /* ignore errors */ })
}
run()