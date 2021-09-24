import AL from "alclient"
import { startAvoidStacking, startBuyLoop, startBuyFriendsReplenishablesLoop, startCompoundLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startUpgradeLoop, goToBankIfFull, goToPoitonSellerIfLow, LOOP_MS, startSendStuffDenylistLoop, kiteInCircle } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { startMluckLoop, doBanking, goFishing, goMining } from "../base/merchant.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"

export const DEFAULT_REGION: AL.ServerRegion = "US"
export const DEFAULT_IDENTIFIER: AL.ServerIdentifier = "III"

const bscorpionPartyLeader = "over9000"
const bscorpionPartyMembers = ["facilitating", "gratuitously", "illumination", "lolwutpear", "shoopdawhoop", "over9000"]

const targets: AL.MonsterName[] = ["bscorpion"]

export async function startBscorpionMageFarmer(bot: AL.Mage, friends: AL.Character[], merchant: string): Promise<void> {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)
    startSendStuffDenylistLoop(bot, [merchant])
    startPartyLoop(bot, bscorpionPartyLeader, bscorpionPartyMembers)
    startUpgradeLoop(bot)

    const bscorpionSpawn = bot.locateMonster("bscorpion")[0]
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
            await goToBankIfFull(bot)

            // Kite the scorpion
            await kiteInCircle(bot, "bscorpion", bscorpionSpawn)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip || bot.c.town) {
                await bot.respawn()
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            if (!bot.canUse("scare", { ignoreEquipped: true })) {
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesMage(bot, targets, friends, { targetingPartyMember: true })

            // Extra cburst damage
            if (bot.canUse("cburst") && bot.mp > bot.max_mp - 500) {
                const bscorp = bot.getNearestMonster("bscorpion")
                if (bscorp && bscorp.distance < bot.range && bscorp.monster.isAttackingPartyMember(bot)) {
                    await bot.cburst([[bscorp.monster.id, bot.mp / 2]])
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("cburst"), bot.getCooldown("attack")))))
    }
    attackLoop()
}

export async function startBscorpionPriestFarmer(bot: AL.Priest, friends: AL.Character[], merchant: string): Promise<void> {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startDarkBlessingLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyHealLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)
    startSendStuffDenylistLoop(bot, [merchant])
    startPartyLoop(bot, bscorpionPartyLeader, bscorpionPartyMembers)
    startUpgradeLoop(bot)

    const bscorpionSpawn = bot.locateMonster("bscorpion")[0]
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
            await goToBankIfFull(bot)

            // Kite the scorpion
            await kiteInCircle(bot, "bscorpion", bscorpionSpawn)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip || bot.c.town) {
                await bot.respawn()
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            if (!bot.canUse("scare", { ignoreEquipped: true })) {
                // Only heal
                await attackTheseTypesPriest(bot, [], friends)
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            const closest = bot.getNearestMonster("bscorpion")
            if (closest && closest.monster.target == undefined && closest.distance <= bot.G.monsters.bscorpion.range) {
                // Only heal
                await attackTheseTypesPriest(bot, [], friends)
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Attack
            await attackTheseTypesPriest(bot, targets, friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()
}

export async function startMerchant(bot: AL.Merchant, friends: AL.Character[], hold: AL.IPosition): Promise<void> {
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

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}