import AL from "alclient"
import { ITEMS_TO_HOLD, LOOP_MS, startAvoidStacking, startBuyLoop, startCompoundLoop, startElixirLoop, startEventLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpgradeLoop } from "../base/general.js"
import { batCaveCryptEntrance, cryptWaitingSpot } from "../base/locations.js"
import { startMluckLoop } from "../base/merchant.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { attackTheseTypesWarrior, startChargeLoop, startHardshellLoop, startWarcryLoop } from "../base/warrior.js"
import { CryptData } from "../definitions/bot.js"
import { isCryptFinished, startCrypt } from "./shared.js"

/** Config */
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "II"
const merchantName = "earthMer"
const priestName = "earthPri"
const rangerName = "earthiverse"
const warriorName = "earthWar"
const partyLeader = merchantName
const partyMembers = [merchantName, priestName, rangerName, warriorName]
const targets: AL.MonsterName[] = ["goldenbat", "bat", "zapper0", "mvampire", "phoenix", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "vbat"]

let merchant: AL.Merchant
let priest: AL.Priest
let ranger: AL.Ranger
let warrior: AL.Warrior

let cryptData: CryptData

async function startShared(bot: AL.Character) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    startEventLoop(bot)
    startExchangeLoop(bot)
    if (bot.id == partyLeader) {
        startPartyLoop(bot, partyLeader, partyMembers)
    } else {
        bot.timeouts.set("partyloop", setTimeout(async () => { startPartyLoop(bot, partyLeader, partyMembers) }, 2000))
    }
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)
    if (bot.ctype !== "merchant") startSendStuffDenylistLoop(bot, [merchantName], ITEMS_TO_HOLD, 10_000_000)
    startUpgradeLoop(bot)
}

async function startMerchant(bot: AL.Merchant) {
    startShared(bot)

    startMluckLoop(bot)

    async function moveLoop() {
        try {
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
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
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

async function startPriest(bot: AL.Priest) {
    startShared(bot)

    startDarkBlessingLoop(bot)
    startPartyHealLoop(bot, [merchant, priest, ranger, warrior])

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesPriest(bot, targets, [merchant, priest, ranger, warrior])

        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (bot.map == "crypt") {
                const position = cryptData.path[cryptData.position]
                position.x += 8
                position.y += 8
                await bot.smartMove(position)
                // do stuff
            }
        } catch (e) {
            console.error(e)
        }
    }
    moveLoop()
    // TODO: Enter crypt if merchant is inside, otherwise farm bats
}

async function startRanger(bot: AL.Ranger) {
    startShared(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesRanger(bot, targets, [merchant, priest, ranger, warrior])

        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    // TODO: Enter crypt if merchant is inside, otherwise farm bats
}

async function startWarrior(bot: AL.Warrior) {
    startShared(bot)

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
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesWarrior(bot, targets, [merchant, priest, ranger, warrior])

        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    // TODO: Enter crypt if merchant is inside, otherwise farm bats
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
                merchant = await AL.Game.startMerchant(name, region, identifier)
                startMerchant(merchant)
                merchant.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (merchant) await merchant.disconnect()
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

    const startPriestLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (priest) await priest.disconnect()
                priest = await AL.Game.startPriest(name, region, identifier)
                startPriest(priest)
                priest.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (priest) await priest.disconnect()
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

    const startRangerLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (ranger) await ranger.disconnect()
                ranger = await AL.Game.startRanger(name, region, identifier)
                startRanger(ranger)
                startTrackerLoop(ranger)
                ranger.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (ranger) await ranger.disconnect()
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

    const startWarriorLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (warrior) await warrior.disconnect()
                warrior = await AL.Game.startWarrior(name, region, identifier)
                startWarrior(warrior)
                warrior.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (warrior) await warrior.disconnect()
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