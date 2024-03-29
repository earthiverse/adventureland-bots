import AL, { Character, IPosition, Merchant, MonsterName, ServerIdentifier, ServerInfoDataLive, ServerRegion, Warrior } from "alclient"
import { LOOP_MS, startCompoundLoop, startHealLoop, startLootLoop, startScareLoop, startSellLoop, startUpgradeLoop, startExchangeLoop, ITEMS_TO_SELL } from "../base/general.js"
import { startMluckLoop, doBanking, goFishing, goMining } from "../base/merchant.js"
import { stompPartyLeader } from "../base/party.js"
import { identifier, region, startLeader, startMailBankKeysToEarthiverseLoop, startShared } from "./runners.js"

/** Config */
const leaderName = stompPartyLeader
const follower1Name = "earthWar2"
const follower2Name = "earthWar3"
// const follower2Name = "earthPri"
const merchantName = "earthMer2"

/** Characters */
let leader: Warrior
let follower1: Warrior
let follower2: Warrior
// let follower2: Priest
let merchant: Merchant

let merchantLocation: IPosition = { map: "main", x: 0, y: 0 }
if (identifier == "PVP") {
    merchantLocation = { map: "level2e", x: 575, y: 150 }
}

async function startMerchant(bot: Merchant, friends: Character[], holdPosition: IPosition): Promise<void> {
    startHealLoop(bot)
    startMluckLoop(bot)
    startUpgradeLoop(bot, { ... ITEMS_TO_SELL })
    startCompoundLoop(bot)
    startExchangeLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)

    // startSellSticksToMerchantsLoop(bot)
    startMailBankKeysToEarthiverseLoop(bot)

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // If we are full, let's go to the bank
            if (bot.isFull() || lastBankVisit < Date.now() - 120000 || bot.hasPvPMarkedItem()) {
                lastBankVisit = Date.now()
                await doBanking(bot)
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
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

                        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
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
                    bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                    return
                }
            }

            // Go fishing if we can
            await goFishing(bot)
            if (!bot.isOnCooldown("fishing") && (bot.hasItem("rod") || bot.isEquipped("rod"))) {
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Go mining if we can
            await goMining(bot)
            if (!bot.isOnCooldown("mining") && (bot.hasItem("pickaxe") || bot.isEquipped("pickaxe"))) {
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // MLuck people if there is a server info target
            for (const mN in bot.S) {
                const type = mN as MonsterName
                if (!(bot.S[type] as ServerInfoDataLive).live) continue
                if (!(bot.S[type] as ServerInfoDataLive).target) continue
                if (bot.S[type]["x"] == undefined || bot.S[type]["y"] == undefined) continue // No location data

                if (AL.Tools.distance(bot, (bot.S[type] as IPosition)) > 100) {
                    await bot.closeMerchantStand()
                    await bot.smartMove((bot.S[type] as IPosition), { getWithin: 100 })
                }

                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Find other characters that need mluck and go find them
            if (bot.canUse("mluck")) {
                const charactersToMluck = await AL.PlayerModel.find({
                    $or: [
                        { "s.mluck": undefined },
                        { "s.mluck.f": { "$ne": bot.id }, "s.mluck.strong": undefined }],
                    lastSeen: { $gt: Date.now() - 120000 },
                    serverIdentifier: bot.server.name,
                    serverRegion: bot.server.region },
                {
                    _id: 0,
                    map: 1,
                    name: 1,
                    x: 1,
                    y: 1
                }).lean().exec()
                for (const stranger of charactersToMluck) {
                    // Move to them, and we'll automatically mluck them
                    if (AL.Tools.distance(bot, stranger) > bot.G.skills.mluck.range) {
                        await bot.closeMerchantStand()
                        console.log(`[merchant] We are moving to ${stranger.name} to mluck them!`)
                        await bot.smartMove(stranger, { getWithin: bot.G.skills.mluck.range / 2 })
                    }

                    setTimeout(moveLoop, 250)
                    return
                }
            }

            // Hang out in town
            await bot.smartMove(holdPosition)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(moveLoop, LOOP_MS))
    }
    async function pvpMoveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            await bot.closeMerchantStand()
            await bot.smartMove(holdPosition)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("pvpMoveLoop", setTimeout(pvpMoveLoop, LOOP_MS))
    }
    if (identifier !== "PVP") moveLoop()
    else pvpMoveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const startLeaderLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (leader) leader.disconnect()
                leader = await AL.Game.startWarrior(name, region, identifier)
                startLeader(leader)
                startShared(leader, merchantName)
                leader.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (leader) leader.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startLeaderLoop(leaderName, region, identifier).catch(() => { /* ignore errors */ })

    const startFollower1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower1) follower1.disconnect()
                follower1 = await AL.Game.startWarrior(name, region, identifier)
                startShared(follower1, merchantName)
                follower1.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (follower1) follower1.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startFollower1Loop(follower1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startFollower2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower2) follower2.disconnect()
                follower2 = await AL.Game.startWarrior(name, region, identifier)
                startShared(follower2, merchantName)
                follower2.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (follower2) follower2.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startFollower2Loop(follower2Name, region, identifier).catch(() => { /* ignore errors */ })

    // const startFollower2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
    //     // Start the characters
    //     const loopBot = async () => {
    //         try {
    //             if (follower2) follower2.disconnect()
    //             follower2 = await AL.Game.startPriest(name, region, identifier)
    //             startPriest(follower2, merchantName)
    //             follower2.socket.on("disconnect", loopBot)
    //         } catch (e) {
    //             console.error(e)
    //             if (follower2) follower2.disconnect()
    //             const wait = /wait_(\d+)_second/.exec(e)
    //             if (wait && wait[1]) {
    //                 setTimeout(loopBot, 2000 + Number.parseInt(wait[1]) * 1000)
    //             } else if (/limits/.test(e)) {
    //                 setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
    //             } else {
    //                 setTimeout(loopBot, 10000)
    //             }
    //         }
    //     }
    //     loopBot()
    // }
    // startFollower2Loop(follower2Name, region, identifier).catch(() => { /* ignore errors */ })

    const startMerchantLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) merchant.disconnect()
                merchant = await AL.Game.startMerchant(name, region, identifier)
                startMerchant(merchant, [leader, follower1, follower2], merchantLocation)
                merchant.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (merchant) merchant.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startMerchantLoop(merchantName, region, identifier).catch(() => { /* ignore errors */ })
}
run()