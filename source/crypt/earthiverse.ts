import AL, { Character, IPosition, ItemName, Mage, Merchant, MonsterName, Priest, Ranger, ServerIdentifier, ServerInfoDataLive, ServerRegion, SlotType, Tools, Warrior } from "alclient"
import { addSocket, startServer } from "algui"
import { calculateAttackLoopCooldown, goGetRspeedBuff, goToKiteStuff, goToNearestWalkableToMonster, ITEMS_TO_HOLD, LOOP_MS, REPLENISHABLES_TO_BUY, startAvoidStacking, startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpgradeLoop } from "../base/general.js"
import { batCaveCryptEntrance, cryptEnd, cryptWaitingSpot, mainCrabs, offsetPositionParty } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { doBanking, doEmergencyBanking, goFishing, goMining, merchantSmartMove, startMluckLoop } from "../base/merchant.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
// import { startChargeLoop, startHardshellLoop, startWarcryLoop, attackTheseTypesWarrior } from "../base/warrior.js"
import { addCryptMonstersToDB, CRYPT_MONSTERS, getCryptMonsterLocation } from "./shared.js"

/** Config */
const region: ServerRegion = "US"
const identifier: ServerIdentifier = "I"
const merchantName = "earthMer"
const mageName = "earthMag"
const priestName = "earthPri"
const rangerName = "earthiverse"
const warriorName = "earthWar"
const partyLeader = merchantName
const partyMembers = [merchantName, priestName, rangerName, mageName, warriorName]
const targets: MonsterName[] = ["goldenbat", "mvampire", "phoenix", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "vbat", "bat", "zapper0"]

let merchant: Merchant
let priest: Priest
let ranger: Ranger
let mage: Mage
// let warrior: Warrior
const friends: [Merchant, Priest, Ranger, Mage | Warrior] = [undefined, undefined, undefined, undefined]

const LAST_LOCATION_CHECK = 0
let LOCATION: IPosition

// Hold snowballs, too
ITEMS_TO_HOLD.add("snowball")

async function startShared(bot: Character) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    if (bot.id == partyLeader) {
        startPartyLoop(bot, partyLeader, partyMembers)
    } else {
        bot.timeouts.set("partyLoop", setTimeout(async () => { startPartyLoop(bot, partyLeader, partyMembers) }, 2000))
    }
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)
    if (bot.ctype !== "merchant") startSendStuffDenylistLoop(bot, [merchantName], ITEMS_TO_HOLD, 10_000_000)
    startUpgradeLoop(bot)
}

async function startMerchant(bot: Merchant) {
    startShared(bot)

    startMluckLoop(bot)

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // Check for crypt monsters every minute
            if (LAST_LOCATION_CHECK < Date.now() - 60000) {
                LOCATION = await getCryptMonsterLocation(bot)
            }

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // If we have a crypt key, let's go add some monsters to our DB
            if (LOCATION == undefined && bot.hasItem("cryptkey")) {
                await bot.smartMove(cryptWaitingSpot)
                addCryptMonstersToDB(bot)
                LOCATION = { in: bot.in, ...cryptEnd }
                await bot.smartMove(batCaveCryptEntrance)
            }

            // If we are full, let's go to the bank
            if (bot.isFull() || lastBankVisit < Date.now() - 120000 || bot.hasPvPMarkedItem()) {
                lastBankVisit = Date.now()
                await doBanking(bot)
                await doEmergencyBanking(bot)
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await merchantSmartMove(bot, "newyear_tree", { attackWhileMoving: true, getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, Math.min(...bot.pings) * 2))
                return
            }

            // Get some buffs from rogues
            await goGetRspeedBuff(bot)

            // mluck our friends
            if (bot.canUse("mluck", { ignoreCooldown: true })) {
                for (const friend of friends) {
                    if (!friend) continue
                    if (friend.id == bot.id) continue
                    if (!friend.s.mluck || !friend.s.mluck.strong || friend.s.mluck.ms < 120000) {
                        // Move to them, and we'll automatically mluck them
                        if (AL.Tools.distance(bot, friend) > bot.G.skills.mluck.range) {
                            console.log(`[merchant] We are moving to ${friend.name} to mluck them!`)
                            await merchantSmartMove(bot, friend, { attackWhileMoving: true, getWithin: bot.G.skills.mluck.range / 2, stopIfTrue: () => (friend.s.mluck?.strong && friend.s.mluck?.ms >= 120000) || Tools.distance(bot.smartMoving, friend) > bot.G.skills.mluck.range })
                        }

                        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                        return
                    }
                }
            }

            for (const friend of friends) {
                if (!friend) continue
                if (friend.id == bot.id) continue

                // Get stuff from our friends
                if (friend.isFull()) {
                    await merchantSmartMove(bot, friend, { attackWhileMoving: true, getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2, stopIfTrue: () => bot.isFull() || !friend.isFull() || Tools.distance(bot.smartMoving, friend) > 400 })
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                    return
                }

                // Buy stuff for our friends
                if (!(friend.hasItem("computer") || friend.hasItem("supercomputer"))
                && (bot.hasItem("computer") || bot.hasItem("supercomputer"))) {
                    // Go buy replenishables for them, since they don't have a computer
                    for (const [item, amount] of REPLENISHABLES_TO_BUY) {
                        if (friend.countItem(item) > amount * 0.25) continue // They have enough
                        if (!bot.canBuy(item)) continue // We can't buy them this for them
                        await merchantSmartMove(bot, friend, { attackWhileMoving: true, getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2, stopIfTrue: () => !bot.canBuy(item) || friend.countItem(item) > amount * 0.25 || Tools.distance(bot.smartMoving, friend) > 400 })

                        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                        return
                    }
                }
            }

            // Go fishing if we can
            await goFishing(bot)
            if (bot.canUse("fishing", { ignoreEquipped: true })) {
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Go mining if we can
            await goMining(bot)
            if (bot.canUse("mining", { ignoreEquipped: true })) {
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            if ((bot.id == "earthMer" || bot.id == "earthMer2") && bot.canUse("mluck", { ignoreCooldown: true })) {
                // MLuck people if there is a server info target
                for (const mN in bot.S) {
                    const type = mN as MonsterName
                    if (!bot.S[type].live) continue
                    if (!(bot.S[type] as ServerInfoDataLive).target) continue
                    if (bot.S[type]["x"] == undefined || bot.S[type]["y"] == undefined) continue // No location data

                    if (AL.Tools.distance(bot, (bot.S[type] as IPosition)) > 100) {
                        await merchantSmartMove(bot, (bot.S[type] as IPosition), { attackWhileMoving: true, getWithin: 100 })
                    }

                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
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
                        console.log(`[merchant] We are moving to ${stranger.name} to mluck them!`)
                        await merchantSmartMove(bot, stranger, { attackWhileMoving: true, getWithin: bot.G.skills.mluck.range / 2 })
                    }

                    setTimeout(async () => { moveLoop() }, 250)
                    return
                }
            }

            // Hang out near crabs
            if (!bot.isEquipped("dartgun") && bot.hasItem("dartgun")) await bot.equip(bot.locateItem("dartgun", bot.items, { returnHighestLevel: true }), "mainhand")
            if (!bot.isEquipped("wbook1") && bot.hasItem("wbook1")) await bot.equip(bot.locateItem("wbook1", bot.items, { returnHighestLevel: true }), "offhand")
            else if (!bot.isEquipped("wbook0") && bot.hasItem("wbook0")) await bot.equip(bot.locateItem("wbook0", bot.items, { returnHighestLevel: true }), "offhand")
            if (!bot.isEquipped("zapper") && bot.hasItem("zapper")) await bot.equip(bot.locateItem("zapper", bot.items, { returnHighestLevel: true }), "ring1")
            await bot.smartMove(mainCrabs)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function startPriest(bot: Priest) {
    startShared(bot)

    startDarkBlessingLoop(bot)
    startPartyHealLoop(bot, friends)

    // Equipment
    const equipment: { [T in SlotType]?: ItemName} = {
        chest: "harmor",
        gloves: "xgloves",
        helmet: "hhelmet",
        mainhand: "firestaff",
        offhand: "wbook1",
        orb: "jacko",
        pants: "hpants"
    }
    if (!equipment.offhand && bot.slots.offhand) await bot.unequip("offhand")
    for (const slot in equipment) {
        const item = bot.locateItem(equipment[slot], bot.items, { returnHighestLevel: true })
        if (item !== undefined) await bot.equip(item, slot as SlotType)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            await attackTheseTypesPriest(bot, ["a8"], friends, { targetingPartyMember: true })
            await attackTheseTypesPriest(bot, ["goldenbat", "mvampire", "phoenix", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "vbat", "bat", "zapper0"], friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, calculateAttackLoopCooldown(bot)))
    }
    attackLoop()

    const batLocations = bot.locateMonster("bat")
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            if (LOCATION == undefined) {
                // Farm bats if we don't have any crypt monsters
                let index = 0
                if (bot.party) index = bot.partyData.list.indexOf(bot.id)
                await goToNearestWalkableToMonster(bot, ["goldenbat", "mvampire", "fvampire", "phoenix", "bat"], batLocations[index % batLocations.length])
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Follow the tank
            await bot.smartMove(offsetPositionParty(friends[3], bot, 10), { resolveOnFinalMoveStart: true })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function startRanger(bot: Ranger) {
    startShared(bot)

    // Equipment
    const equipment: { [T in SlotType]?: ItemName} = {
        chest: "harmor",
        gloves: "hgloves",
        helmet: "cyber",
        mainhand: "pouchbow",
        offhand: "t2quiver",
        orb: "jacko",
        pants: "hpants"
    }
    if (!equipment.offhand && bot.slots.offhand) await bot.unequip("offhand")
    for (const slot in equipment) {
        const item = bot.locateItem(equipment[slot], bot.items, { returnHighestLevel: true })
        if (item !== undefined) await bot.equip(item, slot as SlotType)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesRanger(bot, ["a8"], friends, { targetingPartyMember: true })
            await attackTheseTypesRanger(bot, ["goldenbat", "mvampire", "phoenix", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "vbat", "bat", "zapper0"], friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, calculateAttackLoopCooldown(bot)))
    }
    attackLoop()

    const batLocations = bot.locateMonster("bat")
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            if (LOCATION == undefined) {
                // Farm bats if we don't have any crypt monsters
                let index = 0
                if (bot.party) index = bot.partyData.list.indexOf(bot.id)
                await goToNearestWalkableToMonster(bot, ["goldenbat", "mvampire", "fvampire", "phoenix", "bat"], batLocations[index % batLocations.length])
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Follow the tank
            await bot.smartMove(offsetPositionParty(friends[3], bot, 10), { resolveOnFinalMoveStart: true })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function startMage(bot: Mage) {
    startShared(bot)

    // Equipment
    const equipment: { [T in SlotType]?: ItemName} = {
        chest: "harmor",
        gloves: "hgloves",
        helmet: "hhelmet",
        mainhand: "gstaff",
        orb: "jacko",
        pants: "hpants",
        shoes: "vboots"
    }
    if (!equipment.offhand && bot.slots.offhand) await bot.unequip("offhand")
    for (const slot in equipment) {
        const item = bot.locateItem(equipment[slot], bot.items, { returnHighestLevel: true })
        if (item !== undefined) await bot.equip(item, slot as SlotType)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            const nearest = bot.getEntity({ couldGiveCredit: true, returnNearest: true })
            if (nearest && nearest.target && nearest.speed > bot.speed && !nearest.s.frozen && bot.canUse("snowball")) {
                await bot.throwSnowball(nearest.id)
            }

            // Angel is dangerous, keep our distance
            const angel = bot.getEntity({ type: "a8" })
            if (angel && Tools.distance(bot, angel) < angel.range + angel.speed) {
                // Don't attack angel
                if (angel.target == bot.id && bot.canUse("scare")) {
                    await bot.scare()
                }
                await attackTheseTypesMage(bot, ["goldenbat", "mvampire", "phoenix", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "vbat", "bat", "zapper0"], friends)
            } else {
                await attackTheseTypesMage(bot, targets, friends)
            }

            await attackTheseTypesMage(bot, targets, friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, calculateAttackLoopCooldown(bot)))
    }
    attackLoop()

    const batLocations = bot.locateMonster("bat")
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            if (LOCATION == undefined) {
                // Farm bats if we don't have any crypt monsters
                let index = 0
                if (bot.party) index = bot.partyData.list.indexOf(bot.id)
                await goToNearestWalkableToMonster(bot, ["goldenbat", "mvampire", "fvampire", "phoenix", "bat"], batLocations[index % batLocations.length])
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            const stopLogic = () => {
                // We're near a crypt monster
                const nearest = bot.getEntity({ typeList: CRYPT_MONSTERS })
                if (nearest) return true

                // We need to wait for our friends to catch up
                if (Tools.distance(bot, friends[1]) > 400
                || Tools.distance(bot, friends[2]) > 400) {
                    return true
                }
            }

            // Go to the location it tells us there's a crypt monster at
            await bot.smartMove(LOCATION, { stopIfTrue: stopLogic, useBlink: false })

            const nearest = bot.getEntity({ returnNearest: true })
            if (!nearest) {
                // No nearby monsters, go to the end of the crypt
                await bot.smartMove(cryptEnd, { stopIfTrue: stopLogic, useBlink: false })
            } else {
                switch (nearest.type) {
                    case "a1": // Spike
                    case "bat": {
                        // Spike spawns bats, stand on top of spike to optimize splash damage
                        const spike = bot.getEntity({ type: "a1" })
                        if (spike) bot.smartMove(spike)
                        break
                    }
                    case "a2": // Bill
                        goToKiteStuff(bot, { type: "a2" })
                        break
                    case "a3": // Lestat
                        goToKiteStuff(bot, { type: "a3" })
                        break
                    case "a4": // Orlok
                    case "zapper0": {
                        // Orlok spawns zappers, stand on top of Orlok to optimize splash damage
                        const orlok = bot.getEntity({ type: "a4" })
                        if (orlok) bot.smartMove(orlok)
                        break
                    }
                    case "a5": // Elena
                        goToKiteStuff(bot, { type: "a5" })
                        break
                    case "a6": // Marceline
                        goToKiteStuff(bot, { type: "a6" })
                        break
                    case "a7": // Lucinda
                        goToKiteStuff(bot, { type: "a7" })
                        break
                    case "a8": // Angel
                        goToKiteStuff(bot, { type: "a8" })
                        break
                    case "vbat":
                        goToKiteStuff(bot, { type: "vbat" })
                        break
                    default:
                        console.debug(`We don't have a handler to move to ${nearest.type}!`)
                        break
                }
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

    // Start GUI
    startServer(80, AL.Game.G)

    const startMerchantLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) merchant.disconnect()
                merchant = await AL.Game.startMerchant(name, region, identifier)
                friends[0] = merchant
                startMerchant(merchant)
                addSocket(merchant.id, merchant.socket, merchant)
                merchant.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (merchant) merchant.disconnect()
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

    const startPriestLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (priest) priest.disconnect()
                priest = await AL.Game.startPriest(name, region, identifier)
                friends[1] = priest
                startPriest(priest)
                addSocket(priest.id, priest.socket, priest)
                priest.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (priest) priest.disconnect()
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
    startPriestLoop(priestName, region, identifier).catch(() => { /* ignore errors */ })

    const startRangerLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (ranger) ranger.disconnect()
                ranger = await AL.Game.startRanger(name, region, identifier)
                friends[2] = ranger
                startRanger(ranger)
                startTrackerLoop(ranger)
                addSocket(ranger.id, ranger.socket, ranger)
                ranger.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (ranger) ranger.disconnect()
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
    startRangerLoop(rangerName, region, identifier).catch(() => { /* ignore errors */ })

    // const startWarriorLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
    //     // Start the characters
    //     const loopBot = async () => {
    //         try {
    //             if (warrior) warrior.disconnect()
    //             warrior = await AL.Game.startWarrior(name, region, identifier)
    //             friends[3] = warrior
    //             startWarrior(warrior)
    //             addSocket(warrior.id, warrior.socket, warrior)
    //             warrior.socket.on("disconnect", async () => { loopBot() })
    //         } catch (e) {
    //             console.error(e)
    //             if (warrior) warrior.disconnect()
    //             const wait = /wait_(\d+)_second/.exec(e)
    //             if (wait && wait[1]) {
    //                 setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
    //             } else if (/limits/.test(e)) {
    //                 setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
    //             } else {
    //                 setTimeout(async () => { loopBot() }, 10000)
    //             }
    //         }
    //     }
    //     loopBot()
    // }
    // startWarriorLoop(warriorName, region, identifier).catch(() => { /* ignore errors */ })

    const startMageLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage) mage.disconnect()
                mage = await AL.Game.startMage(name, region, identifier)
                friends[3] = mage
                startMage(mage)
                addSocket(mage.id, mage.socket, mage)
                mage.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage) mage.disconnect()
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
    startMageLoop(mageName, region, identifier).catch(() => { /* ignore errors */ })
}
run()