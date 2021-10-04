import AL, { Character, Constants, Entity, IPosition, Mage, Merchant, MonsterName, Ranger, ServerIdentifier, ServerInfoDataLive, ServerRegion, Tools } from "alclient"
import { LOOP_MS, startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpgradeLoop } from "../base/general.js"
import { doBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"
import { partyLeader, partyMembers } from "../base/party.js"

/** Config */
const merchantName = "earthMer"
const rangerName = "earthiverse"
const mage1Name = "earthMag"
const mage2Name = "earthMag2"
const region: ServerRegion = "US"
const identifier: ServerIdentifier = "II"

const rangerLocation: IPosition = { map: "main", x: 1577.5, y: -168 }
const mage1Location: IPosition = { map: "main", x: 1577.5, y: -279 }
const mage2Location: IPosition = { map: "main", x: 1577.5, y: -57 }
const types = ["scorpion"]

/** Characters */
let merchant: Merchant
let ranger: Ranger
let mage1: Mage
let mage2: Mage

async function startShared(bot: Character) {
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)

    if (bot.ctype !== "merchant") {
        startPartyLoop(bot, partyLeader, partyMembers)
        startSendStuffDenylistLoop(bot, [merchantName])
    }

    startUpgradeLoop(bot)
}

async function startRanger(bot: Ranger) {
    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.isOnCooldown("scare")) {
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("scare"))))
                return
            }

            const targets: Entity[] = []
            for (const [, entity] of bot.entities) {
                if (!types.includes(entity.type)) continue // Not a good type
                if (entity.target && !entity.isAttackingPartyMember(bot)) continue // Won't get credit for kill
                if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far
                if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Death is imminent

                targets.push(entity)
            }

            if (targets.length >= 3 && bot.canUse("3shot")) {
                if (!bot.s.energized) {
                    if (mage1.socket.connected && mage1.canUse("energize") && AL.Tools.distance(bot, mage1) < bot.G.skills.energize.range) {
                        mage1.energize(bot.id)
                    } else if (mage2.socket.connected && mage2.canUse("energize") && AL.Tools.distance(bot, mage2) < bot.G.skills.energize.range) {
                        mage2.energize(bot.id)
                    }
                }

                // If it's a guaranteed kill, remove it from the everyone's entity list so we don't attack it
                for (let i = 0; i < 3; i++) {
                    const target = targets[i]
                    if (bot.calculateDamageRange(target, "3shot")[0] >= target.hp) {
                        for (const friend of [mage1, mage2]) {
                            if (!friend) continue
                            friend.deleteEntity(targets[i].id)
                        }
                    }
                }

                await bot.threeShot(targets[0].id, targets[1].id, targets[2].id)
            } else if (targets.length && bot.canUse("attack")) {
                if (!bot.s.energized) {
                    if (mage1.socket.connected && mage1.canUse("energize")) {
                        mage1.energize(bot.id).catch(e => console.error(e))
                    } else if (mage2.socket.connected && mage2.canUse("energize")) {
                        mage2.energize(bot.id).catch(e => console.error(e))
                    }
                }

                // If it's a guaranteed kill, remove it from the everyone's entity list so we don't attack it
                const target = targets[0]
                if (bot.canKillInOneShot(target)) {
                    for (const friend of [mage1, mage2]) {
                        if (!friend) continue
                        friend.deleteEntity(target.id)
                    }
                }

                await bot.basicAttack(target.id)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
                return
            }

            await bot.smartMove(rangerLocation)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

async function startMage(bot: Mage) {
    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.isOnCooldown("scare")) {
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("scare"))))
                return
            }

            for (const [, entity] of bot.entities) {
                if (!types.includes(entity.type)) continue // Not a good type
                if (entity.target && !entity.isAttackingPartyMember(bot)) continue // Won't get credit for kill
                if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far
                if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Death is imminent

                if (bot.canUse("attack")) {
                    if (bot.canKillInOneShot(entity)) {
                        for (const friend of [ranger, mage1, mage2]) {
                            if (!friend) continue
                            if (friend.id == bot.id) continue
                            if (AL.Constants.SPECIAL_MONSTERS.includes(entity.type)) continue // Don't delete special monsters
                            friend.deleteEntity(entity.id)
                        }
                    }
                    await bot.basicAttack(entity.id)
                }
                break
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    async function cburstLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.isOnCooldown("scare")) {
                bot.timeouts.set("cburstloop", setTimeout(async () => { cburstLoop() }, Math.max(10, bot.getCooldown("scare"))))
                return
            }

            const targets: [string, number][] = []
            for (const [, entity] of bot.entities) {
                if (!types.includes(entity.type)) continue // Not a good type
                if (entity.target && !entity.isAttackingPartyMember(bot)) continue // Won't get credit for kill
                if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far
                if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Death is imminent
                if (entity.hp > 200) continue // We only want to use cburst to kill low hp monsters

                targets.push([entity.id, entity.hp / bot.G.skills.cburst.ratio])
            }

            if (targets.length && bot.canUse("cburst")) {
                await bot.cburst(targets)
            }
        } catch (e) {
            console.error()
        }
        bot.timeouts.set("cburstloop", setTimeout(async () => { cburstLoop() }, Math.max(10, bot.getCooldown("cburst"))))
    }
    cburstLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
                return
            }

            if (bot.id == mage1Name) {
                await bot.smartMove(mage1Location)
            } else {
                await bot.smartMove(mage2Location)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

async function startMerchant(bot: Merchant) {
    startPontyLoop(bot)
    startMluckLoop(bot)
    startPartyLoop(bot, bot.id) // Let anyone who wants to party with me do so

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
                for (const friend of [ranger, mage1, mage2]) {
                    if (!friend) continue
                    if (!friend.s.mluck || !friend.s.mluck.strong || friend.s.mluck.ms < 120000) {
                        // Move to them, and we'll automatically mluck them
                        if (AL.Tools.distance(merchant, friend) > bot.G.skills.mluck.range) {
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
            for (const friend of [ranger, mage1, mage2]) {
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
                const type = mN as MonsterName
                if (!bot.S[type].live) continue
                if (!(bot.S[type] as ServerInfoDataLive).target) continue

                if (AL.Tools.distance(merchant, (bot.S[type] as ServerInfoDataLive)) > 100) {
                    await bot.closeMerchantStand()
                    await bot.smartMove((bot.S[type] as ServerInfoDataLive), { getWithin: 100 })
                }

                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
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

                    setTimeout(async () => { moveLoop() }, 250)
                    return
                }
            }

            // Hang out in town
            await bot.smartMove("main")
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

    // Start all characters
    console.log("Connecting...")

    const startMerchantLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) merchant.disconnect()
                merchant = await AL.Game.startMerchant(name, region, identifier)
                startShared(merchant)
                startMerchant(merchant)
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

    const startRangerLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (ranger) ranger.disconnect()
                ranger = await AL.Game.startRanger(name, region, identifier)
                startShared(ranger)
                startRanger(ranger)
                startTrackerLoop(ranger)
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

    const startMage1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage1) mage1.disconnect()
                mage1 = await AL.Game.startMage(name, region, identifier)
                startShared(mage1)
                startMage(mage1)
                mage1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage1) mage1.disconnect()
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

    const startMage2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage2) mage2.disconnect()
                mage2 = await AL.Game.startMage(name, region, identifier)
                startShared(mage2)
                startMage(mage2)
                mage2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage2) mage2.disconnect()
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
}
run()