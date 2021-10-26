import AL, { IPosition, Mage, MonsterName, ServerIdentifier, ServerRegion } from "alclient"
import { goToPotionSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startSellLoop, goToBankIfFull, ITEMS_TO_SELL, startPartyLoop, startScareLoop, startAvoidStacking } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { partyLeader, partyMembers } from "../base/party.js"

/** Config */
const region: ServerRegion = "EU"
const identifier: ServerIdentifier = "II"
const monsters: MonsterName[] = ["bat", "minimush", "snake", "stoneworm", "osnake", "mvampire", "fvampire", "jr", "greenjr"]

const mage1Name = "earthMag"
const mage2Name = "earthMag2"
const mage3Name = "earthMag3"

let mage1: Mage
let mage2: Mage
let mage3: Mage

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

async function startMage(bot: Mage) {
    const locations: IPosition[] = []
    for (const monster of monsters) locations.push(...bot.locateMonster(monster))

    startAvoidStacking(bot)
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot, { ...ITEMS_TO_SELL, "wbook0": 2 })
    startPartyLoop(bot, partyLeader, partyMembers)

    // We're not AFK, I swear...
    setInterval(() => {
        bot.socket.emit("property", { "afk": false })
    }, 10_000)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const slenderman = bot.getNearestMonster("slenderman")?.monster
            if (slenderman && AL.Tools.distance(bot, slenderman) <= bot.range) {
                // NOTE: We are bursting in the move loop, because we can do it really fast there
                if (bot.canUse("attack")) await bot.basicAttack(slenderman.id).catch(() => { /** Suppress warnings */ })
            } else {
                await attackTheseTypesMage(bot, monsters, [], { disableCburst: true, disableEnergize: true })
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("burst"), bot.getCooldown("cburst")))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            await goToPotionSellerIfLow(bot)
            await goToBankIfFull(bot)

            const slenderman = bot.getNearestMonster("slenderman")?.monster
            if (slenderman && AL.Tools.distance(bot, slenderman) > bot.range) {
                console.log(`Slenderman spotted at ${slenderman.map},${slenderman.x},${slenderman.y} with ${slenderman.hp}/${slenderman.max_hp} HP.`)
                if (bot.canUse("blink")) bot.blink(slenderman.x, slenderman.y).catch(() => { /** Suppress warnings */ })
                if (bot.canUse("burst")) bot.burst(slenderman.id).catch(() => { /** Suppress warnings */ })
            } else if (!bot.smartMoving) {
                bot.smartMove(locations[randomIntFromInterval(0, locations.length)]).catch(() => { /** Suppress warnings */ })
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")
    const startMage1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage1) mage1.disconnect()
                mage1 = await AL.Game.startMage(name, region, identifier)
                startMage(mage1)
                mage1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage1) mage1.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startMage1Loop(mage1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startMage2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage2) mage2.disconnect()
                mage2 = await AL.Game.startMage(name, region, identifier)
                startMage(mage2)
                mage2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage2) mage2.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startMage2Loop(mage2Name, region, identifier).catch(() => { /* ignore errors */ })

    const startMage3Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage3) mage3.disconnect()
                mage3 = await AL.Game.startMage(name, region, identifier)
                startMage(mage3)
                mage3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage3) mage3.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startMage3Loop(mage3Name, region, identifier).catch(() => { /* ignore errors */ })
}
run()