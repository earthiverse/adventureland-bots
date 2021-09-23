import AL from "alclient"
import { goToNearestWalkableToMonster, ITEMS_TO_HOLD, LOOP_MS, startAvoidStacking, startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpgradeLoop } from "../base/general.js"
import { batCaveCryptEntrance, cryptWaitingSpot } from "../base/locations.js"
import { startMluckLoop } from "../base/merchant.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { CryptData } from "../definitions/bot.js"
import { isCryptFinished, startCrypt } from "./shared.js"

/** Config */
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "II"
const merchantName = "earthMer"
const mageName = "earthMag"
const priestName = "earthPri"
const rangerName = "earthiverse"
const warriorName = "earthWar"
const partyLeader = merchantName
const partyMembers = [merchantName, priestName, rangerName, mageName, warriorName]
const targets: AL.MonsterName[] = ["goldenbat", "bat", "zapper0", "mvampire", "phoenix", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "vbat"]

let merchant: AL.Merchant
let priest: AL.Priest
let ranger: AL.Ranger
let mage: AL.Mage
// let warrior: AL.Warrior
const friends: AL.Character[] = [undefined, undefined, undefined, undefined]

let cryptData: CryptData

async function startShared(bot: AL.Character) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
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
    startPartyHealLoop(bot, friends)

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
            await attackTheseTypesPriest(bot, targets, friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    const batLocations = bot.locateMonster("bat")
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            if (merchant.map !== "crypt") {
                // Farm bats if our merchant isn't in a crypt
                let index = 0
                if (bot.party) index = bot.partyData.list.indexOf(bot.id)
                await goToNearestWalkableToMonster(bot, ["mvampire", "fvampire", "phoenix", "goldenbat", "bat"], batLocations[index % batLocations.length])
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Enter the crypt that the merchant is in
            if (merchant.in !== bot.in) await bot.smartMove(merchant)

            // Follow the mage really closely
            await bot.smartMove(mage, { getWithin: 10 })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
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
            await attackTheseTypesRanger(bot, targets, friends)

        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    const batLocations = bot.locateMonster("bat")
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            if (merchant.map !== "crypt") {
                // Farm bats if our merchant isn't in a crypt
                let index = 0
                if (bot.party) index = bot.partyData.list.indexOf(bot.id)
                await goToNearestWalkableToMonster(bot, ["mvampire", "fvampire", "phoenix", "goldenbat", "bat"], batLocations[index % batLocations.length])
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Enter the crypt that the merchant is in
            if (merchant.in !== bot.in) await bot.smartMove(merchant)

            // Follow the mage really closely
            await bot.smartMove(mage, { getWithin: 20 })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function startMage(bot: AL.Mage) {
    startShared(bot)

    // Equipment
    
}

// async function startWarrior(bot: AL.Warrior) {
//     startShared(bot)

//     startChargeLoop(bot)
//     startHardshellLoop(bot)
//     startWarcryLoop(bot)

//     // Equipment
//     if (bot.slots.offhand) await bot.unequip("offhand")
//     const bataxe = bot.locateItem("bataxe", bot.items, { locked: true })
//     if (bataxe !== undefined) await bot.equip(bataxe)
//     const jacko = bot.locateItem("jacko", this.items, { locked: true })
//     if (jacko !== undefined) await bot.equip(jacko)

//     async function attackLoop() {
//         try {
//             if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

//             if (
//                 bot.rip // We are dead
//                 || bot.c.town // We are teleporting to town
//             ) {
//                 bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
//                 return
//             }

//             // Idle strategy
//             await attackTheseTypesWarrior(bot, targets, friends)
//         } catch (e) {
//             console.error(e)
//         }
//         bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
//     }
//     attackLoop()

//     const batLocations = bot.locateMonster("bat")
//     async function moveLoop() {
//         try {
//             if (!bot.socket || bot.socket.disconnected) return

//             // If we are dead, respawn
//             if (bot.rip) {
//                 await bot.respawn()
//                 bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
//                 return
//             }

//             if (merchant.map !== "crypt") {
//                 // Farm bats if our merchant isn't in a crypt
//                 let index = 0
//                 if (bot.party) index = bot.partyData.list.indexOf(bot.id)
//                 await goToNearestWalkableToMonster(bot, ["mvampire", "fvampire", "phoenix", "goldenbat", "bat"], batLocations[index % batLocations.length])
//                 bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
//                 return
//             }

//             // Enter the crypt that the merchant is in
//             if (merchant.in !== bot.in) await bot.smartMove(merchant)

//             await goToNearestWalkableToMonster(bot, ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "vbat"])
//         } catch (e) {
//             console.error(e)
//         }
//         bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
//     }
//     moveLoop()
// }

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
                friends[0] = merchant
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
                friends[1] = priest
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
                friends[2] = ranger
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

    const startMageLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage) await mage.disconnect()
                mage = await AL.Game.startMage(name, region, identifier)
                friends[3] = mage
                startMage(mage)
                mage.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage) await mage.disconnect()
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

    // startWarriorLoop(warriorName, region, identifier).catch(() => { /* ignore errors */ })
    // const startWarriorLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
    //     // Start the characters
    //     const loopBot = async () => {
    //         try {
    //             if (warrior) await warrior.disconnect()
    //             warrior = await AL.Game.startWarrior(name, region, identifier)
    //             friends[3] = warrior
    //             startWarrior(warrior)
    //             warrior.socket.on("disconnect", async () => { loopBot() })
    //         } catch (e) {
    //             console.error(e)
    //             if (warrior) await warrior.disconnect()
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
}
run()