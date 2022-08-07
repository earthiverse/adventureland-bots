import AL, { Character, IPosition, Mage, Merchant, MonsterName, ServerIdentifier, ServerInfoDataLive, ServerRegion } from "alclient"
import { goToPotionSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, goToBankIfFull, ITEMS_TO_SELL, ITEMS_TO_HOLD, startSendStuffDenylistLoop, startScareLoop, startAvoidStacking, startCompoundLoop, startCraftLoop, startUpgradeLoop, startBuyFriendsReplenishablesLoop, LOOP_MS } from "../base/general.js"
import { mainBeesNearTunnel, offsetPosition } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { doBanking, doEmergencyBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"
import { ItemLevelInfo } from "../definitions/bot.js"

/** Config */
const partyLeader = "attackMag"
// const partyMembers = ["attackMag", "attackMag2", "attackMag3"]
const mage1Name = "attackMag"
const mage2Name = "attackMag2"
const mage3Name = "attackMag3"
const merchantName = "attackMer"
const region: ServerRegion = "US"
const identifier: ServerIdentifier = "PVP"
const targets: MonsterName[] = ["bee"]
const defaultLocation: IPosition = mainBeesNearTunnel

let mage1: Mage
let mage2: Mage
let mage3: Mage
let merchant: Merchant
const friends: [Mage, Mage, Mage] = [undefined, undefined, undefined]

const SELL_THESE: ItemLevelInfo = { ...ITEMS_TO_SELL, "beewings": 9999, "hpamulet": 2, "hpbelt": 2, "ringsj": 2, "stinger": 2 }

async function startShared(bot: Character) {
    startAvoidStacking(bot)
    startBuyLoop(bot, new Set())
    startCompoundLoop(bot)
    startCraftLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot, SELL_THESE)
    startUpgradeLoop(bot)
}

async function startMage(bot: Mage, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startPartyLoop(bot, partyLeader)

    // Send merchant stuff
    startSendStuffDenylistLoop(bot, [merchantName], ITEMS_TO_HOLD, 2_000_000)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesMage(bot, targets, friends, { cburstWhenHPLessThan: 301 })
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackLoop", setTimeout(attackLoop, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            await goToPotionSellerIfLow(bot)
            await goToBankIfFull(bot, ITEMS_TO_HOLD, 2_000_000)

            const destination: IPosition = offsetPosition(defaultLocation, positionOffset.x, positionOffset.y)
            if (AL.Tools.distance(bot, destination) > 1) await bot.smartMove(destination)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
    }
    moveLoop()
}

async function startMerchant(bot: Merchant, holdPosition: IPosition) {
    startBuyFriendsReplenishablesLoop(bot, friends)
    startMluckLoop(bot)


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
            if (bot.isFull() || lastBankVisit < Date.now() - 120000) {
                lastBankVisit = Date.now()
                await doBanking(bot)
                await doEmergencyBanking(bot)
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // mluck our friends
            if (bot.canUse("mluck", { ignoreCooldown: true })) {
                for (const friend of [mage1, mage2, mage3]) {
                    if (!friend) continue
                    if (friend.id == bot.id) continue
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
            for (const friend of [mage1, mage2, mage3]) {
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

            if ((bot.id == "earthMer" || bot.id == "earthMer2") && bot.canUse("mluck", { ignoreCooldown: true })) {
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
                const charactersToMluck = await AL.PlayerModel.find({
                    $or: [{ "s.mluck": undefined },
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
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")

    const startmage1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage1) mage1.disconnect()
                mage1 = await AL.Game.startMage(name, region, identifier)
                friends[0] = mage1
                startShared(mage1)
                startMage(mage1)
                mage1.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (mage1) mage1.disconnect()
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
    startmage1Loop(mage1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startmage2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage2) mage2.disconnect()
                mage2 = await AL.Game.startMage(name, region, identifier)
                friends[1] = mage2
                startShared(mage2)
                startMage(mage2, { x: 25, y: 0 })
                mage2.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (mage2) mage2.disconnect()
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
    startmage2Loop(mage2Name, region, identifier).catch(() => { /* ignore errors */ })

    const startmage3Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage3) mage3.disconnect()
                mage3 = await AL.Game.startMage(name, region, identifier)
                friends[2] = mage3
                startShared(mage3)
                startMage(mage3, { x: -25, y: 0 })
                mage3.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (mage3) mage3.disconnect()
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
    startmage3Loop(mage3Name, region, identifier).catch(() => { /* ignore errors */ })

    const startmerchantLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) merchant.disconnect()
                merchant = await AL.Game.startMerchant(name, region, identifier)
                startShared(merchant)
                startMerchant(merchant, { map: "main", x: 365, y: 1275 })
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
    startmerchantLoop(merchantName, region, identifier).catch(() => { /* ignore errors */ })
}
run()