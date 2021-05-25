import AL, { Tools } from "alclient-mongo"
import { goToPoitonSellerIfLow, goToNPCShopIfFull, startBuyLoop, startCompoundLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, startTrackerLoop, startUpgradeLoop, startAvoidStacking } from "../base/general.js"
import { startChargeLoop, startWarcryLoop } from "../base/warrior.js"

/** Config */
const warrior1Name = "earthWar"
const warrior2Name = "earthWar2"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "I"
const target: AL.MonsterName = "goo"
const defaultLocation: AL.IPosition = { map: "main", x: -32, y: 787 } // goos

let warrior1: AL.Warrior
let warrior2: AL.Warrior

async function startShared(bot: AL.Character) {
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, warrior1Name)
    startSellLoop(bot)

    startUpgradeLoop(bot)
}

async function startWarrior(bot: AL.Warrior, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("attack")) {
                for (const [, entity] of bot.entities) {
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far away
                    if (entity.cooperative !== true && entity.target && ![warrior1?.id, warrior2?.id].includes(entity.target)) continue // It's targeting someone else
                    if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                    if (entity.willBurnToDeath()) continue // Will burn to death shortly

                    if (bot.canKillInOneShot(entity)) {
                        for (const friend of [warrior1, warrior2]) {
                            if (!friend) continue
                            friend.entities.delete(entity.id)
                        }
                    }

                    await bot.basicAttack(entity.id)

                    // Move to the next entity if we're gonna kill it
                    if (bot.canKillInOneShot(entity)) {
                        let closest: AL.Entity
                        let distance = Number.MAX_VALUE
                        for (const [, entity] of bot.entities) {
                            if (entity.type !== target) continue // Only attack our target
                            if (!AL.Pathfinder.canWalkPath(bot, entity)) continue // Can't simply walk to entity
                            if (entity.cooperative !== true && entity.target && ![warrior1?.id, warrior2?.id].includes(entity.target)) continue // It's targeting someone else
                            if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                            if (entity.willBurnToDeath()) continue // Will burn to death shortly

                            const d = Tools.distance(bot, entity)
                            if (d < distance) {
                                closest = entity
                                distance = d
                            }
                        }

                        if (closest && Tools.distance(bot, closest) > bot.range) {
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

    startAvoidStacking(bot)
    startChargeLoop(bot)

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

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
                if (entity.cooperative !== true && entity.target && ![warrior1?.id, warrior2?.id].includes(entity.target)) continue // It's targeting someone else
                if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                if (entity.willBurnToDeath()) continue // Will burn to death shortly

                const d = Tools.distance(bot, entity)
                if (d < distance) {
                    closest = entity
                    distance = d
                }
            }

            if (!closest) {
                const destination: AL.IPosition = { map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y }
                if (AL.Tools.distance(bot, destination) > 1) await bot.smartMove(destination)
            } else if (Tools.distance(bot, closest) > bot.range) {
                bot.smartMove(closest, { getWithin: bot.range / 2 }).catch(() => { /* suppress warnings */ })
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()

    startWarcryLoop(bot)
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData()])
    await AL.Pathfinder.prepare(AL.Game.G)
    
    // Start all characters
    console.log("Connecting...")

    const startWarrior1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (warrior1) await warrior1.disconnect()
                warrior1 = await AL.Game.startWarrior(name, region, identifier)
                startShared(warrior1)
                startWarrior(warrior1)
                startTrackerLoop(warrior1)
                warrior1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (warrior1) await warrior1.disconnect()
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
    startWarrior1Loop(warrior1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startWarrior2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (warrior2) await warrior2.disconnect()
                warrior2 = await AL.Game.startWarrior(name, region, identifier)
                startShared(warrior2)
                startWarrior(warrior2, { x: -20, y: 0 })
                warrior2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (warrior2) await warrior2.disconnect()
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
    startWarrior2Loop(warrior2Name, region, identifier).catch(() => { /* ignore errors */ })
}
run()