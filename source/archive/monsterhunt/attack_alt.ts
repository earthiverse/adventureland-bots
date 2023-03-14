import AL, { Merchant, Paladin, Ranger, Rogue, ServerRegion, ServerIdentifier } from "alclient"
import { goToNearestWalkableToMonster, startTrackerLoop } from "../base/general.js"
import { attackTheseTypesPaladin } from "../base/paladin.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { attackTheseTypesRogue } from "../base/rogue.js"
import { Information, Strategy } from "../../definitions/bot.js"
import { startMerchant, startPaladin, startRanger, startRogue } from "./shared.js"

const TARGET_REGION: ServerRegion = "US"
const TARGET_IDENTIFIER: ServerIdentifier = "I"
const partyLeader = "attacking"
const partyMembers = ["attacking", "attackPal", "attackRog"]

const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        bot: undefined,
        name: "attackPal",
        target: undefined
    },
    bot2: {
        bot: undefined,
        name: "attacking",
        target: undefined
    },
    bot3: {
        bot: undefined,
        name: "attackRog",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: "attackMer",
        nameAlt: "attackMer",
        target: undefined
    }
}

function prepareMerchant(bot: Merchant) {
    const strategy: Strategy = { }
    startMerchant(bot, information, strategy, { map: "main", x: 0, y: 0 }, partyLeader, partyMembers, TARGET_REGION, TARGET_IDENTIFIER)
}

function preparePaladin(bot: Paladin) {
    const strategy: Strategy = {
        defaultTarget: "osnake",
        // eslint-disable-next-line sort-keys
        osnake: {
            attack: async () => { await attackTheseTypesPaladin(bot, ["osnake", "snake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake", "snake"], { map: "halloween", x: -488, y: -708 }) },
        },
        snake: {
            attack: async () => { await attackTheseTypesPaladin(bot, ["snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["snake", "osnake"], { map: "halloween", x: -488, y: -708 }) },
        }
    }
    startPaladin(bot, information, strategy, partyLeader, partyMembers, TARGET_REGION, TARGET_IDENTIFIER)
}

function prepareRanger(bot: Ranger) {
    const strategy: Strategy = {
        defaultTarget: "osnake",
        // eslint-disable-next-line sort-keys
        osnake: {
            attack: async () => { return attackTheseTypesRanger(bot, ["osnake", "snake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake", "snake"], { map: "halloween", x: -589, y: -335 }) },
        },
        snake: {
            attack: async () => { return attackTheseTypesRanger(bot, ["snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["snake", "osnake"], { map: "halloween", x: -589, y: -335 }) },
        }
    }

    startRanger(bot, information, strategy, partyLeader, partyMembers, TARGET_REGION, TARGET_IDENTIFIER)
}

function prepareRogue(bot: Rogue) {
    const strategy: Strategy = {
        defaultTarget: "osnake",
        // eslint-disable-next-line sort-keys
        osnake: {
            attack: async () => { await attackTheseTypesRogue(bot, ["osnake", "snake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake", "snake"], { map: "halloween", x: 347, y: -747 }) },
        },
        snake: {
            attack: async () => { await attackTheseTypesRogue(bot, ["snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["snake", "osnake"], { map: "halloween", x: 347, y: -747 }) },
        }
    }
    startRogue(bot, information, strategy, partyLeader, partyMembers, TARGET_REGION, TARGET_IDENTIFIER)
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")

    const startMerchantLoop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.merchant.bot) information.merchant.bot.disconnect()
                information.merchant.bot = await AL.Game.startMerchant(information.merchant.nameAlt, TARGET_REGION, TARGET_IDENTIFIER)

                information.friends[0] = information.merchant.bot
                prepareMerchant(information.merchant.bot)
                information.merchant.bot.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (information.merchant.bot) information.merchant.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(loopBot, 500)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startMerchantLoop().catch(() => { /* ignore errors */ })

    const startPaladinLoop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot1.bot) information.bot1.bot.disconnect()
                information.bot1.bot = await AL.Game.startPaladin(information.bot1.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[1] = information.bot1.bot
                preparePaladin(information.bot1.bot as Paladin)
                information.bot1.bot.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (information.bot1.bot) information.bot1.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(loopBot, 500)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startPaladinLoop().catch(() => { /* ignore errors */ })

    const startRangerLoop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot2.bot) information.bot2.bot.disconnect()
                information.bot2.bot = await AL.Game.startRanger(information.bot2.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[2] = information.bot2.bot
                prepareRanger(information.bot2.bot as Ranger)
                startTrackerLoop(information.bot2.bot)
                information.bot2.bot.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (information.bot2.bot) information.bot2.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(loopBot, 500)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startRangerLoop().catch(() => { /* ignore errors */ })

    const startRogueLoop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot3.bot) information.bot3.bot.disconnect()
                information.bot3.bot = await AL.Game.startRogue(information.bot3.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[3] = information.bot3.bot
                prepareRogue(information.bot3.bot as Rogue)
                information.bot3.bot.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (information.bot3.bot) information.bot3.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(loopBot, 500)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startRogueLoop().catch(() => { /* ignore errors */ })
}
run()