import AL, { Character, IPosition, Mage, Merchant, MonsterName, Pathfinder, Priest, Rogue, ServerInfoDataLive } from "alclient"
import { startAvoidStacking, startBuyLoop, startBuyFriendsReplenishablesLoop, startCompoundLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startUpgradeLoop, goToBankIfFull, goToPotionSellerIfLow, LOOP_MS, startSendStuffDenylistLoop, kiteInCircle, goToNearestWalkableToMonster } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { startMluckLoop, doBanking, goFishing, goMining } from "../base/merchant.js"
import { partyMembers } from "../base/party.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import { attackTheseTypesRogue, startRSpeedLoop } from "../base/rogue.js"

const bscorpionPartyLeader = "illumination"
const bscorpionPartyMembers = partyMembers

const targets: MonsterName[] = ["bscorpion"]

export async function startBscorpionMageFarmer(bot: Mage, friends: Character[], merchant: string): Promise<void> {
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

    const bscorpionSpawn = Pathfinder.locateMonster("bscorpion")[0]
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
            await goToBankIfFull(bot)

            // Kite the scorpion
            await kiteInCircle(bot, "bscorpion", bscorpionSpawn)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
    }
    moveLoop()

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip || bot.c.town) {
                await bot.respawn()
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            if (!bot.canUse("scare", { ignoreEquipped: true })) {
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesMage(bot, targets, friends, { targetingPartyMember: true })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, Math.max(LOOP_MS, Math.min(bot.getCooldown("cburst"), bot.getCooldown("attack")))))
    }
    attackLoop()
}

export async function startBscorpionRogueFarmer(bot: Rogue, friends: Character[], merchant: string): Promise<void> {
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

    startRSpeedLoop(bot, { enableGiveToStrangers: true })

    async function invisLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.s.invis && bot.canUse("invis")) bot.invis()
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(invisLoop, Math.max(100, bot.getCooldown("invis"))))
    }
    invisLoop()

    const bscorpionSpawn = Pathfinder.locateMonster("bscorpion")[0]
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
            await goToBankIfFull(bot)

            // Kite the scorpion
            await goToNearestWalkableToMonster(bot, ["bscorpion"], bscorpionSpawn, 25)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
    }
    moveLoop()

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip || bot.c.town) {
                await bot.respawn()
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            if (!bot.canUse("scare", { ignoreEquipped: true })) {
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesRogue(bot, targets, friends, { targetingPartyMember: true })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, Math.max(LOOP_MS, Math.min(bot.getCooldown("quickstab"), bot.getCooldown("quickpunch"), bot.getCooldown("attack"), bot.getCooldown("mentalburst")))))
    }
    attackLoop()
}

export async function startBscorpionPriestFarmer(bot: Priest, friends: Character[], merchant: string): Promise<void> {
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

    const bscorpionSpawn = Pathfinder.locateMonster("bscorpion")[0]
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
            await goToBankIfFull(bot)

            // Kite the scorpion
            await kiteInCircle(bot, "bscorpion", bscorpionSpawn)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
    }
    moveLoop()

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip || bot.c.town) {
                await bot.respawn()
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            if (!bot.canUse("scare", { ignoreEquipped: true })) {
                // Only heal
                await attackTheseTypesPriest(bot, [], friends)
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            const closest = bot.getEntity({ returnNearest: true, type: "bscorpion" })
            if (closest && closest.target == undefined && AL.Tools.distance(bot, closest) <= bot.G.monsters.bscorpion.range) {
                // Only heal
                await attackTheseTypesPriest(bot, [], friends)
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            if (bot.id == bscorpionPartyLeader && closest && closest.target !== undefined && closest.target !== bot.id) {
                const targetedPlayer = bot.players.get(closest.target)
                if (targetedPlayer.party == bot.party && bot.canUse("absorb")) {
                    await bot.absorbSins(targetedPlayer.id)
                }
            }

            // Attack
            await attackTheseTypesPriest(bot, targets, friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, Math.max(LOOP_MS, bot.getCooldown("attack"))))
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

            // Hang out in town
            await bot.smartMove(hold)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
    }
    moveLoop()
}