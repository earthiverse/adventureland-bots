import AL from "alclient"
import { goToPoitonSellerIfLow, goToNPCShopIfFull, startBuyLoop, startCompoundLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpgradeLoop, ITEMS_TO_SELL, startElixirLoop, goToBankIfFull, goToNearestWalkableToMonster } from "../base/general.js"
import { mainGoos } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { doBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"
import { partyLeader, partyMembers } from "../base/party.js"

/** Config */
const merchantName = "orlyowl"
const mage1Name = "lolwutpear"
const mage2Name = "ytmnd"
const mage3Name = "shoopdawhoop"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "II"
const targets: AL.MonsterName[] = ["cutebee", "goo"]
const defaultLocation: AL.IPosition = mainGoos

let merchant: AL.Merchant
let mage1: AL.Mage
let mage2: AL.Mage
let mage3: AL.Mage

async function startShared(bot: AL.Character) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot)
    if (bot.ctype !== "merchant") {
        startElixirLoop(bot, "elixirluck")
        startSendStuffDenylistLoop(bot, [merchantName])
        startPartyLoop(bot, partyLeader, partyMembers)
    }
}

async function startMage(bot: AL.Mage, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            await attackTheseTypesMage(bot, targets, [mage1, mage2, mage3], { cburstWhenHPLessThan: 101 })
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    // Steal other people's targets with cburst
    bot.socket.on("action", (data: AL.ActionData) => {
        if (!["3shot", "5shot"].includes(data.type)) return
        if (!bot.canUse("cburst")) return // Cburst not available
        if (bot.mp < bot.max_mp / 2) return // Don't cburst when mp is low
        if (bot.c.town) return // Don't cburst when teleporting

        const attacker = bot.players.get(data.attacker)
        if (!attacker) return // Attacker is very far away

        if (AL.Tools.distance(bot, attacker) > 400) return // Probably not attacking the same target

        const cburstData: [string, number][] = []
        for (const [, entity] of bot.entities) {
            if (!targets.includes(entity.type)) continue // Not the type we want
            if (entity.target) continue // Already has a target
            if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far

            cburstData.push([entity.id, 1 / bot.G.skills.cburst.ratio])
        }

        if (cburstData.length && bot.canUse("cburst")) {
            bot.cburst(cburstData).catch(() => { /* Suppress warnings */ })
        }
    })

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            await goToBankIfFull(bot)

            // Get a luck elixir if we don't have one
            if (!bot.slots.elixir && bot.gold > bot.G.items.elixirluck.g) {
                await bot.smartMove("elixirluck", { getWithin: 100 })
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Get a MH if we're on the default server and we don't have one
            if (!bot.s.monsterhunt && bot.server.name == identifier && bot.server.region == region) {
                await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1 })
                await bot.getMonsterHuntQuest()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Turn in our monsterhunt if we can
            if (bot.s.monsterhunt && bot.s.monsterhunt.c == 0) {
                await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1 })
                await bot.finishMonsterHuntQuest()
                await bot.getMonsterHuntQuest() // Get a new one
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            await goToPoitonSellerIfLow(bot)

            const destination: AL.IPosition = { map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y }
            if (AL.Tools.distance(bot, destination) > 1) await bot.smartMove(destination)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function startMerchant(bot: AL.Merchant) {
    startCompoundLoop(bot)
    startUpgradeLoop(bot)
    startPartyLoop(bot, bot.id) // Let anyone who wants to party with me do so

    startMluckLoop(bot)

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            // If we are full, let's go to the bank
            if (bot.isFull() || lastBankVisit < Date.now() - 120000 || bot.hasPvPMarkedItem()) {
                lastBankVisit = Date.now()
                await doBanking(bot)
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // MLuck people if there is a server info target
            for (const mN in bot.S) {
                const type = mN as AL.MonsterName
                if (bot.S[type].live) continue
                if (!(bot.S[type] as AL.ServerInfoDataLive).target) continue

                if (AL.Tools.distance(bot, (bot.S[type] as AL.ServerInfoDataLive)) > 100) {
                    await bot.closeMerchantStand()
                    await bot.smartMove((bot.S[type] as AL.ServerInfoDataLive), { getWithin: 100 })
                }

                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // mluck our friends
            if (bot.canUse("mluck")) {
                for (const friend of [mage1, mage2, mage3]) {
                    if (!friend) continue
                    if (!friend.s.mluck || !friend.s.mluck.strong || friend.s.mluck.ms < 120000) {
                        // Move to them, and we'll automatically mluck them
                        if (AL.Tools.distance(bot, friend) > bot.G.skills.mluck.range) {
                            await bot.closeMerchantStand()
                            console.log(`[merchant] We are moving to ${friend.name} to mluck them!`)
                            await bot.smartMove(friend, { getWithin: bot.G.skills.mluck.range / 2 })
                        }

                        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                        return
                    }
                }
            }

            // Go fishing if we can
            await goFishing(bot)

            // Go mining if we can
            await goMining(bot)

            // Hang out in town
            await bot.smartMove({ map: "main", x: -230, y: -100 })
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")

    const startMerchantLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) await merchant.disconnect()
                merchant = await AL.Game.startMerchant(name, region, identifier)
                startShared(merchant)
                startMerchant(merchant)
                merchant.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (merchant) await merchant.disconnect()
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
    startMerchantLoop(merchantName, region, identifier).catch(() => { /* ignore errors */ })

    const startMage1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage1) await mage1.disconnect()
                mage1 = await AL.Game.startMage(name, region, identifier)
                startShared(mage1)
                startMage(mage1, { x: -50, y: -0 })
                startTrackerLoop(mage1)
                mage1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage1) await mage1.disconnect()
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
    startMage1Loop(mage1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startMage2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage2) await mage2.disconnect()
                mage2 = await AL.Game.startMage(name, region, identifier)
                startShared(mage2)
                startMage(mage2, { x: -100, y: 0 })
                mage2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage2) await mage2.disconnect()
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
    startMage2Loop(mage2Name, region, identifier).catch(() => { /* ignore errors */ })

    const startRogueLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage3) await mage3.disconnect()
                mage3 = await AL.Game.startMage(name, region, identifier)
                startShared(mage3)
                startMage(mage3, { x: -150, y: 0 })
                mage3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage3) await mage3.disconnect()
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
    startRogueLoop(mage3Name, region, identifier).catch(() => { /* ignore errors */ })
}
run()