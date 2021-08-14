import AL from "alclient-mongo"
import { startPontyLoop, LOOP_MS, startCompoundLoop, startHealLoop, startLootLoop, startScareLoop, startSellLoop, startUpgradeLoop, startExchangeLoop, ITEMS_TO_SELL, startTrackerLoop } from "../base/general.js"
import { startMluckLoop, doBanking, goFishing, goMining } from "../base/merchant.js"
import { stompPartyLeader } from "../base/party.js"
import { identifier, region, startSellSticksToMerchantsLoop, startShared } from "./runners.js"

/** Config */
const leaderName = stompPartyLeader
const follower1Name = "earthWar2"
const follower2Name = "earthWar3"
const merchantName = "earthMer"

/** Characters */
let leader: AL.Warrior
let follower1: AL.Warrior
let follower2: AL.Warrior
let merchant: AL.Merchant

async function startMerchant(bot: AL.Merchant, friends: AL.Character[], holdPosition: AL.IPosition): Promise<void> {
    startHealLoop(bot)
    startMluckLoop(bot)
    startPontyLoop(bot)
    startUpgradeLoop(bot, { ... ITEMS_TO_SELL, "stick": 100 })
    startCompoundLoop(bot)
    startExchangeLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)

    startSellSticksToMerchantsLoop(bot)

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

            // mluck our friends
            if (bot.canUse("mluck")) {
                for (const friend of friends) {
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

            // get stuff from our friends
            for (const friend of friends) {
                if (!friend) continue
                if (friend.isFull()) {
                    await bot.smartMove(friend, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                    lastBankVisit = Date.now()
                    await doBanking(bot)
                    bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                    return
                }
            }

            // Go fishing if we can
            await goFishing(bot)

            // Go mining if we can
            await goMining(bot)

            // MLuck people if there is a server info target
            for (const mN in bot.S) {
                const type = mN as AL.MonsterName
                if (!bot.S[type].live) continue
                if (!(bot.S[type] as AL.ServerInfoDataLive).target) continue

                if (AL.Tools.distance(bot, (bot.S[type] as AL.ServerInfoDataLive)) > 100) {
                    await bot.closeMerchantStand()
                    await bot.smartMove((bot.S[type] as AL.ServerInfoDataLive), { getWithin: 100 })
                }

                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Find other characters that need mluck and go find them
            if (bot.canUse("mluck")) {
                const charactersToMluck = await AL.PlayerModel.find({ $or: [{ "s.mluck": undefined }, { "s.mluck.f": { "$ne": bot.id }, "s.mluck.strong": undefined }], lastSeen: { $gt: Date.now() - 120000 }, serverIdentifier: bot.server.name, serverRegion: bot.server.region }).lean().exec()
                for (const stranger of charactersToMluck) {
                    // Move to them, and we'll automatically mluck them
                    if (AL.Tools.distance(bot, stranger) > bot.G.skills.mluck.range) {
                        await bot.closeMerchantStand()
                        console.log(`[merchant] We are moving to ${stranger.name} to mluck them!`)
                        await bot.smartMove(stranger, { getWithin: bot.G.skills.mluck.range / 2 })
                    }

                    setTimeout(async () => { moveLoop() }, 250)
                    return
                }
            }

            // Hang out in town
            await bot.smartMove(holdPosition)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const startLeaderLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (leader) await leader.disconnect()
                leader = await AL.Game.startWarrior(name, region, identifier)
                startShared(leader, merchantName)
                startTrackerLoop(leader)
                leader.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (leader) await leader.disconnect()
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
    startLeaderLoop(leaderName, region, identifier).catch(() => { /* ignore errors */ })

    const startFollower1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower1) await follower1.disconnect()
                follower1 = await AL.Game.startWarrior(name, region, identifier)
                startShared(follower1, merchantName)
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
                follower2 = await AL.Game.startWarrior(name, region, identifier)
                startShared(follower2, merchantName)
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

    const startMerchantLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) await merchant.disconnect()
                merchant = await AL.Game.startMerchant(name, region, identifier)
                startMerchant(merchant, [leader, follower1, follower2], { map: "main", x: -210, y: -100 })
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
}
run()