import AL, { Character, ItemName, Mage, Merchant, MonsterName, Priest, Ranger, ServerIdentifier, ServerRegion, SlotType, Warrior } from "alclient"
import { addSocket, startServer } from "algui"
import { calculateAttackLoopCooldown, goToKiteStuff, goToNearestWalkableToMonster, ITEMS_TO_HOLD, LOOP_MS, startAvoidStacking, startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpgradeLoop } from "../base/general.js"
import { batCaveCryptEntrance, cryptEnd, cryptWaitingSpot } from "../base/locations.js"
import { startMluckLoop } from "../base/merchant.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { startChargeLoop, startHardshellLoop, startWarcryLoop, attackTheseTypesWarrior } from "../base/warrior.js"
import { CryptData } from "../definitions/bot.js"
import { isCryptFinished, startCrypt } from "./shared.js"

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
const targets: MonsterName[] = ["goldenbat", "bat", "zapper0", "mvampire", "phoenix", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "vbat"]

let merchant: Merchant
let priest: Priest
let ranger: Ranger
let warrior: Warrior
const friends: [Merchant, Priest, Ranger, Mage | Warrior] = [undefined, undefined, undefined, undefined]

let cryptData: CryptData

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

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (bot.map == "crypt" || cryptData) {
                // We're in the crypt
                if (isCryptFinished(cryptData)) {
                    // We're finished, move to the entrance to leave the crypt
                    cryptData = undefined
                    await bot.smartMove(batCaveCryptEntrance)
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                    return
                } else {
                    // Wait in the crypt until we are finished
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                    return
                }
            }

            if (bot.hasItem("cryptkey")) {
                // We have a key, we enter the crypt
                await bot.smartMove(cryptWaitingSpot)
                cryptData = startCrypt(bot.in)
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

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
            await attackTheseTypesPriest(bot, targets, friends)
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

            if (merchant.map !== "crypt") {
                // Farm bats if our merchant isn't in a crypt
                let index = 0
                if (bot.party) index = bot.partyData.list.indexOf(bot.id)
                await goToNearestWalkableToMonster(bot, ["goldenbat", "mvampire", "fvampire", "phoenix", "bat"], batLocations[index % batLocations.length])
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Enter the crypt that the merchant is in
            if (merchant.in !== bot.in) await bot.smartMove(merchant)

            // Follow the tank really closely
            await bot.smartMove(friends[3], { getWithin: 10, resolveOnFinalMoveStart: true })
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
        mainhand: "crossbow",
        offhand: "t2quiver",
        orb: "jacko",
        pants: "hpants"
    }
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
            await attackTheseTypesRanger(bot, targets, friends)
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

            if (merchant.map !== "crypt") {
                // Farm bats if our merchant isn't in a crypt
                let index = 0
                if (bot.party) index = bot.partyData.list.indexOf(bot.id)
                await goToNearestWalkableToMonster(bot, ["goldenbat", "mvampire", "fvampire", "phoenix", "bat"], batLocations[index % batLocations.length])
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Enter the crypt that the merchant is in
            if (merchant.in !== bot.in) await bot.smartMove(merchant)

            // Follow the tank really closely
            await bot.smartMove(friends[3], { getWithin: 20, resolveOnFinalMoveStart: true })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function startWarrior(bot: Warrior) {
    startShared(bot)

    startChargeLoop(bot)
    startHardshellLoop(bot)
    startWarcryLoop(bot)

    // Equipment
    const equipment: { [T in SlotType]?: ItemName} = {
        chest: "harmor",
        gloves: "xgloves",
        helmet: "hhelmet",
        mainhand: "bataxe",
        orb: "jacko",
        pants: "hpants"
    }
    if (bot.slots.offhand) await bot.unequip("offhand")
    for (const slot in equipment) {
        const item = bot.locateItem(equipment[slot], bot.items, { returnHighestLevel: true })
        if (item !== undefined) await bot.equip(item, slot as SlotType)
    }
    if (bot.slots.offhand) await bot.unequip("offhand")
    const bataxe = bot.locateItem("bataxe", bot.items, { locked: true })
    if (bataxe !== undefined) await bot.equip(bataxe)
    const jacko = bot.locateItem("jacko", bot.items, { locked: true })
    if (jacko !== undefined) await bot.equip(jacko)

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
            await attackTheseTypesWarrior(bot, targets, friends)
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

            if (merchant.map !== "crypt") {
                // Farm bats if our merchant isn't in a crypt
                let index = 0
                if (bot.party) index = bot.partyData.list.indexOf(bot.id)
                await goToNearestWalkableToMonster(bot, ["goldenbat", "mvampire", "fvampire", "phoenix", "bat"], batLocations[index % batLocations.length])
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Enter the crypt that the merchant is in
            if (merchant.in !== bot.in) await bot.smartMove(merchant)

            const nearest = bot.getEntity({ returnNearest: true })
            if (!nearest && !bot.smartMoving) {
                // No nearby monsters, go to the end of the crypt
                bot.smartMove(cryptEnd).catch(e => console.error(e))
            } else if (!nearest) {
                // Wait for smartMove to bring us close to something
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            if (nearest) {
                if (bot.smartMoving) await bot.stopSmartMove()
                switch (nearest.type) {
                    case "a1": // Spike
                    case "bat": // Spike spawns bats
                        goToKiteStuff(bot, { type: "a1" })
                        break
                    case "a2": // Bill
                        goToKiteStuff(bot, { type: "a2" })
                        break
                    case "a3": // Lestat
                        goToKiteStuff(bot, { type: "a3" })
                        break
                    case "a4": // Orlok
                    case "zapper0": // Orlok spawns zappers
                        goToKiteStuff(bot, { type: "a4" })
                        break
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

    const startWarriorLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (warrior) warrior.disconnect()
                warrior = await AL.Game.startWarrior(name, region, identifier)
                friends[3] = warrior
                startWarrior(warrior)
                addSocket(warrior.id, warrior.socket, warrior)
                warrior.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (warrior) warrior.disconnect()
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
    startWarriorLoop(warriorName, region, identifier).catch(() => { /* ignore errors */ })
}
run()