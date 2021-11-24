import AL, { IPosition, Priest, Warrior, ServerIdentifier, ServerRegion, Merchant, MonsterName, ServerInfoDataLive, Character, AchievementProgressData, AchievementProgressDataFirehazard, Tools, Ranger } from "alclient"
import { ITEMS_TO_HOLD, LOOP_MS, startAvoidStacking, startBuyLoop, startCompoundLoop, startCraftLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpgradeLoop } from "../base/general.js"
import { startMluckLoop, doBanking, goFishing, goMining } from "../base/merchant.js"
import { startPartyHealLoop } from "../base/priest.js"
import { Information } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION } from "../monsterhunt/shared.js"

/**
 * Put the weapon you want to firehazard on `bot1`.
 * Equip bot1 with something with a lot of armor and a `jacko` (important!)
 */

/** Config */
const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        /** Character that holds the weapon to firehazard */
        bot: undefined,
        name: "earthiverse",
        target: undefined
    },
    bot2: {
        /** Priest #1 */
        bot: undefined,
        name: "earthPri",
        target: undefined
    },
    bot3: {
        /** Priest #2 */
        bot: undefined,
        name: "earthPri2",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: "earthMer",
        nameAlt: "earthMer",
        target: undefined
    }
}
const merchantLocation: IPosition = { map: "main", x: 50, y: 50 }

async function startFirehazardRanger(bot: Ranger) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startCraftLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, information.bot1.name)
    startPontyLoop(bot)
    startSellLoop(bot)
    startSendStuffDenylistLoop(bot, [information.merchant.name, information.merchant.nameAlt], ITEMS_TO_HOLD, 10_000_000)
    startTrackerLoop(bot)
    startUpgradeLoop(bot)

    if (!bot.isEquipped("jacko")) {
        const orb = bot.locateItem("jacko", bot.items, { locked: true })
        if (orb !== undefined) await bot.equip(orb, "orb")
    }

    bot.socket.on("achievement_progress", (data: AchievementProgressData) => {
        if (data.name == "firehazard") {
            console.log(`Firehazard Progress: ${(data as AchievementProgressDataFirehazard).count}/${(data as AchievementProgressDataFirehazard).needed}`)
        }
    })

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("scare") && bot.hp < bot.max_hp / 2) {
                await bot.scare()
            }

            if (bot.canUse("attack")) {
                const targets = []
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    typeList: ["mummy"],
                    withinRange: bot.range
                })) {
                    if (entity.hp < bot.attack * 4) continue // Low HP, don't attack it

                    targets.push(entity.id)
                }

                // TODO: implement 3shot and 5shot

                if (targets.length > 0) {
                    bot.basicAttack(targets[0])
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("scare"), bot.getCooldown("attack"), bot.getCooldown("taunt")))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            let highestMummyLevel = 0
            for (const [, entity] of bot.entities) {
                if (entity.type !== "mummy") continue
                if (entity.level > highestMummyLevel) highestMummyLevel = entity.level
            }

            if ((highestMummyLevel <= 1 || bot.targets <= 1) && bot.canUse("scare")) {
                // Step inside and aggro mummies
                await bot.smartMove({ map: "spookytown", x: 250, y: -1131 })
            } else {
                // Stay back
                await bot.smartMove({ map: "spookytown", x: 250, y: -1129 })
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

async function startFirehazardWarrior(bot: Warrior) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startCraftLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, information.bot1.name)
    startPontyLoop(bot)
    startSellLoop(bot)
    startSendStuffDenylistLoop(bot, [information.merchant.name, information.merchant.nameAlt], ITEMS_TO_HOLD, 10_000_000)
    startTrackerLoop(bot)
    startUpgradeLoop(bot)

    if (!bot.isEquipped("jacko")) {
        const orb = bot.locateItem("jacko", bot.items, { locked: true })
        if (orb !== undefined) await bot.equip(orb, "orb")
    }

    bot.socket.on("achievement_progress", (data: AchievementProgressData) => {
        if (data.name == "firehazard") {
            console.log(`Firehazard Progress: ${(data as AchievementProgressDataFirehazard).count}/${(data as AchievementProgressDataFirehazard).needed}`)
        }
    })

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("scare") && bot.hp < bot.max_hp / 2) {
                await bot.scare()
            }

            if (bot.canUse("taunt")) {
                for (const entity of bot.getEntities({
                    targetingMe: false,
                    targetingPartyMember: true
                })) {
                    await bot.taunt(entity.id)
                    break
                }
            }

            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    typeList: ["mummy"],
                    withinRange: bot.range
                })) {
                    if (entity.hp < bot.attack * 4) continue // Low HP, don't attack it

                    await bot.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("scare"), bot.getCooldown("attack"), bot.getCooldown("taunt")))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            let highestMummyLevel = 0
            for (const [, entity] of bot.entities) {
                if (entity.type !== "mummy") continue
                if (entity.level > highestMummyLevel) highestMummyLevel = entity.level
            }

            if ((highestMummyLevel <= 1 || bot.targets <= 1) && bot.canUse("scare")) {
                // Step inside and aggro mummies
                await bot.smartMove({ map: "spookytown", x: 250, y: -1131 })
            } else {
                // Stay back
                await bot.smartMove({ map: "spookytown", x: 250, y: -1129 })
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

function startSupportPriest(bot: Priest) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startCraftLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, information.bot1.name)
    startPontyLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)
    startSendStuffDenylistLoop(bot, [information.merchant.name, information.merchant.nameAlt], ITEMS_TO_HOLD, 10_000_000)
    startUpgradeLoop(bot)

    startPartyHealLoop(bot, information.friends)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("heal")) {
                for (const friend of information.friends) {
                    if (!friend) continue
                    if (friend.hp / friend.max_hp > 0.8) continue // Friend still has a lot of hp
                    if (Tools.distance(bot, friend) > bot.range) continue // Out of range

                    await bot.heal(friend.id)
                    break
                }
            }

            // Attack only if it's targeting our warrior, and it won't burn to death
            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    targetingPartyMember: true,
                    willBurnToDeath: false,
                    willDieToProjectiles: false,
                    withinRange: bot.range
                })) {
                    if (bot.canKillInOneShot(entity)) {
                        for (const friend of information.friends) {
                            if (!friend) continue
                            if (bot.id == friend.id) continue
                            friend.entities.delete(entity.id)
                        }
                    }
                    await bot.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.id == information.bot2.name){
                await bot.smartMove({ map: "spookytown", x: 270, y: -1129 })
            } else {
                await bot.smartMove({ map: "spookytown", x: 230, y: -1129 })
            }

        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

function startMerchant(bot: Merchant, friends: Character[], holdPosition: IPosition) {
    startHealLoop(bot)
    startMluckLoop(bot)
    startPontyLoop(bot)
    startUpgradeLoop(bot)
    startCompoundLoop(bot)
    startExchangeLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)

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

            // get stuff from our friends
            for (const friend of friends) {
                if (!friend) continue
                if (friend.isFull()) {
                    await bot.smartMove(friend, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                    lastBankVisit = Date.now()
                    await doBanking(bot)
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                    return
                }
            }

            // Go fishing if we can
            await goFishing(bot)
            if (!bot.isOnCooldown("fishing") && (bot.hasItem("rod") || bot.isEquipped("rod"))) {
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Go mining if we can
            await goMining(bot)
            if (!bot.isOnCooldown("mining") && (bot.hasItem("pickaxe") || bot.isEquipped("pickaxe"))) {
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // MLuck people if there is a server info target
            for (const mN in bot.S) {
                const type = mN as MonsterName
                if (!bot.S[type].live) continue
                if (!(bot.S[type] as ServerInfoDataLive).target) continue
                if (bot.S[type]["x"] == undefined || bot.S[type]["y"] == undefined) continue // No location data

                if (AL.Tools.distance(bot, (bot.S[type] as IPosition)) > 100) {
                    await bot.closeMerchantStand()
                    await bot.smartMove((bot.S[type] as IPosition), { getWithin: 100 })
                }

                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
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
            await bot.smartMove(holdPosition)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
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
                if (information.merchant.bot) information.merchant.bot.disconnect()
                information.merchant.bot = await AL.Game.startMerchant(name, region, identifier)
                information.friends[0] = information.merchant.bot
                startMerchant(information.merchant.bot, information.friends, merchantLocation)
                information.merchant.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.merchant.bot) information.merchant.bot.disconnect()
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
    startMerchantLoop(information.merchant.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })

    const startRangerLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot1.bot) information.bot1.bot.disconnect()
                information.bot1.bot = await AL.Game.startRanger(name, region, identifier)
                information.friends[1] = information.bot1.bot
                startFirehazardRanger(information.bot1.bot as Ranger)
                information.bot1.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot1.bot) information.bot1.bot.disconnect()
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
    startRangerLoop(information.bot1.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })

    // const startWarriorLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
    //     // Start the characters
    //     const loopBot = async () => {
    //         try {
    //             if (information.bot1.bot) information.bot1.bot.disconnect()
    //             information.bot1.bot = await AL.Game.startWarrior(name, region, identifier)
    //             information.friends[1] = information.bot1.bot
    //             startFirehazardWarrior(information.bot1.bot as Warrior)
    //             information.bot1.bot.socket.on("disconnect", async () => { loopBot() })
    //         } catch (e) {
    //             console.error(e)
    //             if (information.bot1.bot) information.bot1.bot.disconnect()
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
    // startWarriorLoop(information.bot1.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })

    const startPriest1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot2.bot) information.bot2.bot.disconnect()
                information.bot2.bot = await AL.Game.startPriest(name, region, identifier)
                information.friends[2] = information.bot2.bot
                startSupportPriest(information.bot2.bot as Priest)
                information.bot2.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot2.bot) information.bot2.bot.disconnect()
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
    startPriest1Loop(information.bot2.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })

    const startPriest2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot3.bot) information.bot3.bot.disconnect()
                information.bot3.bot = await AL.Game.startPriest(name, region, identifier)
                information.friends[3] = information.bot3.bot
                startSupportPriest(information.bot3.bot as Priest)
                information.bot3.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot3.bot) information.bot3.bot.disconnect()
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
    startPriest2Loop(information.bot3.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })
}
run()