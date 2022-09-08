import AL, { Character, Warrior, Priest, Merchant, IPosition, MonsterName, ServerInfoDataLive, ItemName } from "alclient"
import { startAvoidStacking, startBuyLoop, startCompoundLoop, startCraftLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, ITEMS_TO_HOLD, startUpgradeLoop, LOOP_MS, moveInCircle, startBuyFriendsReplenishablesLoop, REPLENISHABLES_TO_BUY, goGetRspeedBuff, calculateAttackLoopCooldown, checkOnlyEveryMS } from "../base/general.js"
import { startMluckLoop, doBanking, doEmergencyBanking, goFishing, goMining } from "../base/merchant.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { startDarkBlessingLoop, startPartyHealLoop, attackTheseTypesPriest } from "../base/priest.js"
import { startChargeLoop, startHardshellLoop, startWarcryLoop, attackTheseTypesWarrior } from "../base/warrior.js"

async function startShared(bot: Character, merchant: string, friends: Character[]) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startCraftLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot, friends)
    if (bot.ctype !== "merchant") {
        if (bot.id == partyLeader) {
            startPartyLoop(bot, partyLeader, partyMembers)
        } else {
            bot.timeouts.set("partyLoop", setTimeout(async () => { startPartyLoop(bot, partyLeader, partyMembers) }, 2000))
        }
    }
    startScareLoop(bot)
    startSellLoop(bot)
    if (bot.ctype !== "merchant") startSendStuffDenylistLoop(bot, [merchant], ITEMS_TO_HOLD, 10_000_000)
    startUpgradeLoop(bot)
}

export async function startWarrior(bot: Warrior, merchant: string, friends: Character[], mainhand: ItemName, offhand: ItemName, location: IPosition) {
    startShared(bot, merchant, friends)

    startChargeLoop(bot)
    startHardshellLoop(bot)
    startWarcryLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            const promises: Promise<unknown>[] = []
            if (bot.slots.mainhand?.name !== mainhand) {
                const item = bot.locateItem(mainhand, bot.items, { locked: true, returnHighestLevel: true })
                promises.push(bot.equip(item, "mainhand"))
            }
            if (bot.slots.offhand?.name !== offhand) {
                const item = bot.locateItem(offhand, bot.items, { locked: true, returnHighestLevel: true })
                promises.push(bot.equip(item, "offhand"))
            }

            // Idle strategy
            promises.push(attackTheseTypesWarrior(bot, ["prat"], friends, { disableStomp: true }))
            await Promise.all(promises)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, calculateAttackLoopCooldown(bot)))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.volatile.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, Math.min(...bot.pings) * 2))
                return
            }

            // Get some buffs from rogues
            if (checkOnlyEveryMS(`${bot.id}_rspeed`, 10000)) await goGetRspeedBuff(bot)

            // Get a luck elixir
            if (!bot.slots.elixir
                     && !(bot.hasItem(["computer", "supercomputer"]))
                     && bot.canBuy("elixirluck", { ignoreLocation: true })
                     && !bot.isFull()) {
                await bot.smartMove("elixirluck")
            }

            await moveInCircle(bot, location, 30, Math.PI / 4)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
    }
    moveLoop()
}

export async function startPriest(bot: Priest, merchant: string, friends: Character[], location: IPosition) {
    startShared(bot, merchant, friends)

    startDarkBlessingLoop(bot)
    startPartyHealLoop(bot, friends)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesPriest(bot, ["prat"], friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.volatile.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, Math.min(...bot.pings) * 2))
                return
            }

            // Get some buffs from rogues
            if (checkOnlyEveryMS(`${bot.id}_rspeed`, 10000)) await goGetRspeedBuff(bot)

            // Get a luck elixir
            if (!bot.slots.elixir
                     && !(bot.hasItem(["computer", "supercomputer"]))
                     && bot.canBuy("elixirluck", { ignoreLocation: true })
                     && !bot.isFull()) {
                await bot.smartMove("elixirluck")
            }

            await bot.smartMove(location)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(moveLoop, LOOP_MS))
    }
    moveLoop()
}

export async function startMerchant(bot: Merchant, friends: Character[], standPlace: IPosition) {
    startShared(bot, bot.id, friends)

    startBuyFriendsReplenishablesLoop(bot, friends)
    startMluckLoop(bot)
    startPartyLoop(bot, bot.id)

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
                await doEmergencyBanking(bot)
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.closeMerchantStand()
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.volatile.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, Math.min(...bot.pings) * 2))
                return
            }

            // Get some buffs from rogues
            if (checkOnlyEveryMS(`${bot.id}_rspeed`, 10000)) await goGetRspeedBuff(bot)

            // mluck our friends
            if (bot.canUse("mluck", { ignoreCooldown: true })) {
                for (const friend of friends) {
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

            for (const friend of friends) {
                if (!friend) continue
                if (friend.id == bot.id) continue

                // Get stuff from our friends
                if (friend.isFull()) {
                    await bot.closeMerchantStand()
                    await bot.smartMove(friend, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                    lastBankVisit = Date.now()
                    await doBanking(bot)
                    bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                    return
                }

                // Buy stuff for our friends
                if (!(friend.hasItem("computer") || friend.hasItem("supercomputer"))
                && (bot.hasItem(["computer", "supercomputer"]))) {
                    // Go buy replenishables for them, since they don't have a computer
                    for (const [item, amount] of REPLENISHABLES_TO_BUY) {
                        if (friend.countItem(item) > amount * 0.25) continue // They have enough
                        if (!bot.canBuy(item)) continue // We can't buy them this for them
                        await bot.closeMerchantStand()
                        await bot.smartMove(friend, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })

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

            if ((bot.id == "earthMer" || bot.id == "earthMer2") && bot.canUse("mluck", { ignoreCooldown: true })) {
                // MLuck people if there is a server info target
                for (const mN in bot.S) {
                    const type = mN as MonsterName
                    if (!(bot.S[type] as ServerInfoDataLive).live) continue
                    if (!(bot.S[type] as ServerInfoDataLive).target) continue
                    if (bot.S[type]["x"] == undefined || bot.S[type]["y"] == undefined) continue // No location data

                    if (AL.Tools.distance(bot, (bot.S[type] as IPosition)) > 25) {
                        await bot.closeMerchantStand()
                        await bot.smartMove((bot.S[type] as IPosition), { getWithin: 25 })
                    }

                    bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                    return
                }

                // Find other characters that need mluck and go find them
                const playersToMLuck = await AL.PlayerModel.find({
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
                for (const player of playersToMLuck) {
                    // Move to them, and we'll automatically mluck them
                    if (AL.Tools.distance(bot, player) > bot.G.skills.mluck.range) {
                        await bot.closeMerchantStand()
                        console.log(`[merchant] We are moving to ${player.name} to mluck them!`)
                        await bot.smartMove(player, { getWithin: bot.G.skills.mluck.range / 2 })
                    }

                    setTimeout(moveLoop, 250)
                    return
                }
            }

            // Hang out in town
            await bot.smartMove(standPlace)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(moveLoop, LOOP_MS))
    }
    moveLoop()
}