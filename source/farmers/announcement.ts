import AL from "alclient-mongo"
import { goToPoitonSellerIfLow, goToNPCShopIfFull, startBuyLoop, startCompoundLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpgradeLoop, startAvoidStacking, sleep } from "../base/general.js"
import { mainScorpions } from "../base/locations.js"
import { doBanking, startMluckLoop } from "../base/merchant.js"
import { startChargeLoop, startWarcryLoop } from "../base/warrior.js"
import { partyLeader, partyMembers } from "./party.js"

/** Config */
const merchantName = "decisiveness"
const warrior1Name = "announcement"
const warrior2Name = "battleworthy"
const warrior3Name = "charmingness"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "I"
const target: AL.MonsterName = "scorpion"
const defaultLocation: AL.IPosition = mainScorpions

let merchant: AL.Merchant
let warrior1: AL.Warrior
let warrior2: AL.Warrior
let warrior3: AL.Warrior

async function startShared(bot: AL.Character) {
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot)

    if (bot.ctype !== "merchant") {
        startPartyLoop(bot, partyLeader, partyMembers)
        startSendStuffDenylistLoop(bot, merchantName)
    }

    startUpgradeLoop(bot)
}

async function startWarrior(bot: AL.Warrior, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("attack")) {
                for (const [, entity] of bot.entities) {
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far away
                    if (entity.cooperative !== true && entity.target && ![warrior1?.id, warrior2?.id, warrior3?.id, merchant?.id].includes(entity.target)) continue // It's targeting someone else
                    if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                    if (entity.willBurnToDeath()) continue // Will burn to death shortly

                    if (bot.canKillInOneShot(entity)) {
                        for (const friend of [merchant, warrior1, warrior2, warrior3]) {
                            if (!friend) continue
                            friend.entities.delete(entity.id)
                        }
                    }

                    await bot.basicAttack(entity.id)

                    // Move to the next entity if we're gonna kill it
                    if (bot.canKillInOneShot(entity)) {
                        let closest: AL.Entity
                        let distance = Number.MAX_VALUE
                        for (const [, entity] of bot.entities) {
                            if (entity.type !== target) continue // Only attack our target
                            if (!AL.Pathfinder.canWalkPath(bot, entity)) continue // Can't simply walk to entity
                            if (entity.cooperative !== true && entity.target && ![warrior1?.id, warrior2?.id, warrior3?.id, merchant?.id].includes(entity.target)) continue // It's targeting someone else
                            if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                            if (entity.willBurnToDeath()) continue // Will burn to death shortly

                            const d = AL.Tools.distance(bot, entity)
                            if (d < distance) {
                                closest = entity
                                distance = d
                            }
                        }

                        if (closest && AL.Tools.distance(bot, closest) > bot.range) {
                            const newClosest:AL.IPosition = { map: closest.map, x: closest.x + positionOffset.x, y: closest.y + positionOffset.y}
                            bot.smartMove(newClosest).catch(() => { /* suppress warnings */ })
                        }
                    }
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    startAvoidStacking(bot)
    startChargeLoop(bot)

    const myLocation = { map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y }
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
            await goToNPCShopIfFull(bot)

            let closest: AL.Entity
            let distance = Number.MAX_VALUE
            for (const [, entity] of bot.entities) {
                if (entity.type !== target) continue // Only attack our target
                if (!AL.Pathfinder.canWalkPath(bot, entity)) continue // Can't simply walk to entity
                if (entity.cooperative !== true && entity.target && ![warrior1?.id, warrior2?.id, warrior3?.id, merchant?.id].includes(entity.target)) continue // It's targeting someone else
                if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                if (entity.willBurnToDeath()) continue // Will burn to death shortly

                const d = AL.Tools.distance(bot, entity)
                if (d < distance) {
                    closest = entity
                    distance = d
                }
            }

            if (closest) {
                bot.smartMove({map: closest.map, x: closest.x + positionOffset.x, y: closest.y + positionOffset.y}).catch(() => { /* suppress errors */ })
            } else {
                await bot.smartMove(myLocation)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()

    startWarcryLoop(bot)
}

async function startMerchant(bot: AL.Merchant) {
    startPartyLoop(bot, bot.id) // Let anyone who wants to party with me do so

    startMluckLoop(bot)

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
                for (const friend of [warrior1, warrior2, warrior3]) {
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
            if (bot.getCooldown("fishing") == 0 /* Fishing is available */
                && (bot.hasItem("rod") || bot.isEquipped("rod")) /* We have a rod */) {
                let wasEquippedMainhand = bot.slots.mainhand
                let wasEquippedOffhand = bot.slots.offhand
                if (wasEquippedOffhand) await bot.unequip("offhand") // rod is a 2-handed weapon, so we need to unequip our offhand if we have something equipped
                else if (bot.hasItem("wbook1")) wasEquippedOffhand = { name: "wbook1" } // We want to equip a wbook1 by default if we have one after we go fishing
                if (wasEquippedMainhand) {
                    if (wasEquippedMainhand.name !== "rod") {
                        // We didn't have a rod equipped before, let's equip one now
                        await bot.unequip("mainhand")
                        await bot.equip(bot.locateItem("rod"))
                    }
                } else {
                    // We didn't have anything equipped before
                    if (bot.hasItem("dartgun")) wasEquippedMainhand = { name: "dartgun" } // We want to equip a dartgun by default if we have one after we go fishing
                    await bot.equip(bot.locateItem("rod")) // Equip the rod
                }
                bot.closeMerchantStand()
                await bot.smartMove({ map: "main", x: -1368, y: 0 }) // Move to fishing sppot
                await bot.fish()
                if (wasEquippedMainhand) await bot.equip(bot.locateItem(wasEquippedMainhand.name))
                if (wasEquippedOffhand) await bot.equip(bot.locateItem(wasEquippedOffhand.name))
            }

            // Go mining if we can
            if (bot.getCooldown("mining") == 0 /* Mining is available */
                && (bot.hasItem("pickaxe") || bot.isEquipped("pickaxe")) /* We have a pickaxe */) {
                let wasEquippedMainhand = bot.slots.mainhand
                let wasEquippedOffhand = bot.slots.offhand
                if (wasEquippedOffhand) await bot.unequip("offhand") // pickaxe is a 2-handed weapon, so we need to unequip our offhand if we have something equipped
                else if (bot.hasItem("wbook1")) wasEquippedOffhand = { name: "wbook1" } // We want to equip a wbook1 by default if we have one after we go mining
                if (wasEquippedMainhand) {
                    if (wasEquippedMainhand.name !== "pickaxe") {
                        // We didn't have a pickaxe equipped before, let's equip one now
                        await bot.unequip("mainhand")
                        await bot.equip(bot.locateItem("pickaxe"))
                    }
                } else {
                    // We didn't have anything equipped before
                    if (bot.hasItem("dartgun")) wasEquippedMainhand = { name: "dartgun" } // We want to equip a dartgun by default if we have one after we go mining
                    await bot.equip(bot.locateItem("pickaxe")) // Equip the pickaxe
                }
                bot.closeMerchantStand()
                await bot.smartMove({ map: "tunnel", x: -280, y: -10 }) // Move to mining sppot
                await bot.mine()
                if (wasEquippedMainhand) await bot.equip(bot.locateItem(wasEquippedMainhand.name))
                if (wasEquippedOffhand) await bot.equip(bot.locateItem(wasEquippedOffhand.name))
            }

            // Hang out in town
            await bot.smartMove({ map: "main", x: -200, y: -100 })
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")

    const startMerchantLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) await merchant.disconnect()
                await sleep(2000)
                merchant = await AL.Game.startMerchant(name, region, identifier)
                startShared(merchant)
                startMerchant(merchant)
                merchant.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (merchant) await merchant.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS - 2000)
                } else {
                    setTimeout(async () => { loopBot() }, 8000)
                }
            }
        }
        loopBot()
    }
    startMerchantLoop(merchantName, region, identifier).catch(() => { /* ignore errors */ })

    const startWarrior1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (warrior1) await warrior1.disconnect()
                await sleep(2000)
                warrior1 = await AL.Game.startWarrior(name, region, identifier)
                startShared(warrior1)
                startWarrior(warrior1)
                startTrackerLoop(warrior1)
                warrior1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (warrior1) await warrior1.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS - 2000)
                } else {
                    setTimeout(async () => { loopBot() }, 8000)
                }
            }
        }
        loopBot()
    }
    startWarrior1Loop(warrior1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startWarrior2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (warrior2) await warrior2.disconnect()
                await sleep(2000)
                warrior2 = await AL.Game.startWarrior(name, region, identifier)
                startShared(warrior2)
                startWarrior(warrior2, { x: -6, y: 0 })
                warrior2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (warrior2) await warrior2.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS - 2000)
                } else {
                    setTimeout(async () => { loopBot() }, 8000)
                }
            }
        }
        loopBot()
    }
    startWarrior2Loop(warrior2Name, region, identifier).catch(() => { /* ignore errors */ })

    const startWarrior3Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (warrior3) await warrior3.disconnect()
                await sleep(2000)
                warrior3 = await AL.Game.startWarrior(name, region, identifier)
                startShared(warrior3)
                startWarrior(warrior3, { x: 6, y: 0 })
                warrior3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (warrior3) await warrior3.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS - 2000)
                } else {
                    setTimeout(async () => { loopBot() }, 8000)
                }
            }
        }
        loopBot()
    }
    startWarrior3Loop(warrior3Name, region, identifier).catch(() => { /* ignore errors */ })
}
run()