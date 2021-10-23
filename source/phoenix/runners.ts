import AL, { Character, Constants, IPosition, Mage, Merchant, MonsterName, ServerIdentifier, ServerInfoDataLive, ServerRegion, Tools } from "alclient"
import { EntityModel } from "alclient/build/database/Database"
import { goToBankIfFull, goToPotionSellerIfLow, LOOP_MS, startAvoidStacking, startBuyFriendsReplenishablesLoop, startBuyLoop, startCompoundLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startUpgradeLoop } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { doBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"

export const DEFAULT_REGION: ServerRegion = "US"
export const DEFAULT_IDENTIFIER: ServerIdentifier = "II"

const phoenixPartyLeader = "facilitating"
const phoenixPartyMembers = ["facilitating", "gratuitously", "hypothesized", "lolwutpear", "shoopdawhoop", "ytmnd"]

const targets: MonsterName[] = ["phoenix", "bat", "goo", "snake", "armadillo", "croc", "scorpion", "tortoise", "squig", "crab", "crabx", "bee", "spider", "minimush"]

export async function startPhoenixFarmer(bot: Mage, friends: Character[], merchant: string): Promise<void> {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)
    startSendStuffDenylistLoop(bot, [merchant])
    startPartyLoop(bot, phoenixPartyLeader, phoenixPartyMembers)
    startUpgradeLoop(bot)

    const phoenixSpawns = bot.locateMonster("phoenix")
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            await goToPotionSellerIfLow(bot)
            await goToBankIfFull(bot)

            // Look for nearby phoenixes
            const nearbyPhoenix = bot.getNearestMonster("phoenix")
            if (nearbyPhoenix) {
                await bot.smartMove(nearbyPhoenix.monster, { getWithin: bot.range - 50, useBlink: true })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Look for phoenix in the database
            const dbPhoenix = await AL.EntityModel.findOne({ serverIdentifier: bot.server.name, serverRegion: bot.server.region, type: "phoenix" }).lean().exec()
            if (dbPhoenix) {
                await bot.smartMove(dbPhoenix, { getWithin: bot.range - 50, useBlink: true })

                if (AL.Tools.distance(bot, dbPhoenix) < AL.Constants.MAX_VISIBLE_RANGE / 2) {
                    // If we're near the database entry, but we don't see it, delete it.
                    const nearbyPhoenix = bot.getNearestMonster("phoenix")?.monster
                    if (!nearbyPhoenix) await AL.EntityModel.deleteOne({ serverIdentifier: bot.server.name, serverRegion: bot.server.region, type: "phoenix" }).lean().exec()
                }

                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Chill out at one of the spawns
            let index = 0
            if (bot.party) index = bot.partyData.list.indexOf(bot.id)
            await bot.smartMove(phoenixSpawns[index % phoenixSpawns.length], {
                getWithin: 50,
                useBlink: true
            })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip || bot.c.town) {
                await bot.respawn()
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesMage(bot, targets, friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
    }
    attackLoop()
}

export async function startMerchant(bot: Merchant, friends: Character[], hold: IPosition): Promise<void> {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startBuyFriendsReplenishablesLoop(bot, friends)
    startCompoundLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startMluckLoop(bot)
    startPartyLoop(bot, bot.id) // Let anyone who wants to party with me do so
    startScareLoop(bot)
    startSellLoop(bot)
    startUpgradeLoop(bot)

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            // If we are full, let's go to the bank
            if (bot.isFull() || lastBankVisit < Date.now() - 120000 || bot.hasPvPMarkedItem()) {
                lastBankVisit = Date.now()
                await doBanking(bot)
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // MLuck people if there is a server info target
            for (const mN in bot.S) {
                const type = mN as MonsterName
                if (bot.S[type].live) continue
                if (!(bot.S[type] as ServerInfoDataLive).target) continue
                if (bot.S[type]["x"] == undefined || bot.S[type]["y"] == undefined) continue // No location data

                if (AL.Tools.distance(bot, (bot.S[type] as IPosition)) > 100) {
                    await bot.closeMerchantStand()
                    await bot.smartMove((bot.S[type] as IPosition), { getWithin: 100 })
                }

                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
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

                        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                        return
                    }
                }
            }

            // Go fishing if we can
            await goFishing(bot)

            // Go mining if we can
            await goMining(bot)

            // Hang out in town
            await bot.smartMove(hold)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}