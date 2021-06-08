import AL from "alclient-mongo"
import { goToNearestWalkableToMonster, moveInCircle } from "../base/general.js"
import { attackTheseTypes } from "../base/ranger.js"
import { Information, Strategy } from "../definitions/bot.js"
import { IDENTIFIER, REGION, startMerchant, startPriest, startRanger, startWarrior } from "./shared.js"

const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    merchant: {
        bot: undefined,
        name: "earthMer",
        target: undefined
    },
    priest: {
        bot: undefined,
        name: "earthPri",
        target: undefined
    },
    ranger: {
        bot: undefined,
        name: "earthiverse",
        target: undefined
    },
    warrior: {
        bot: undefined,
        name: "earthWar",
        target: undefined
    }
}

function prepareMerchant(bot: AL.Merchant) {
    startMerchant(bot, information, {})
}

function preparePriest(bot: AL.Priest) {
    startPriest(bot, information, {})
}

function prepareRanger(bot: AL.Ranger) {
    const bscorpionSpawn = bot.locateMonster("bscorpion")[0]
    const strategy: Strategy = {
        arcticbee: {
            attack: async () => { await attackTheseTypes(bot, ["arcticbee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 1082, y: -873 }) },
        },
        armadillo: {
            attack: async () => { await attackTheseTypes(bot, ["armadillo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 526, y: 1846 }) },
        },
        bat: {
            attack: async () => { await attackTheseTypes(bot, ["bat", "goldenbat", "mvampire"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "cave", x: -194, y: -461 }) },
        },
        bbpompom: {
            attack: async () => { await attackTheseTypes(bot, ["bbpompom"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "winter_cave", x: 51, y: -164 }) },
        },
        bee: {
            attack: async () => { await attackTheseTypes(bot, ["bee", "cutebee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 494, y: 1101 }) },
        },
        bigbird: {
            attack: async () => { await attackTheseTypes(bot, ["bee", "cutebee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 1343, y: 248 }) },
        },
        boar: {
            attack: async () => { await attackTheseTypes(bot, ["boar"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 20, y: -1109 }) },
        },
        booboo: {
            attack: async () => { await attackTheseTypes(bot, ["booboo"], information.friends) },
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 265, y: -645 }) },
        },
        bscorpion: {
            attack: async () => { return attackTheseTypes(bot, ["bscorpion"], information.friends, { targetingPlayer: "earthPri" }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await moveInCircle(bot, bscorpionSpawn) },
        },
        cgoo: {
            attack: async () => { return attackTheseTypes(bot, ["cgoo"], information.friends) },
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { goToNearestWalkableToMonster(bot, ["cgoo"], { map: "arena", x: 0, y: -500 }) },
        },
        crab: {
            attack: async () => { return attackTheseTypes(bot, ["crab"], information.friends) },
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -1202, y: -66 }) },
        },
        crabx: {
            attack: async () => { return attackTheseTypes(bot, ["crabx"], information.friends) },
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { goToNearestWalkableToMonster(bot, ["crabx"], { map: "main", x: -1202, y: -66 }) },
        }
    }

    startRanger(bot, information, strategy)
}

function prepareWarrior(bot: AL.Warrior) {
    startWarrior(bot, information, {})
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
                if (information.merchant.bot) await information.merchant.bot.disconnect()
                information.merchant.bot = await AL.Game.startMerchant(name, region, identifier)
                information.friends[0] = information.merchant.bot
                prepareMerchant(information.merchant.bot)
                information.merchant.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.merchant.bot) await information.merchant.bot.disconnect()
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
    startMerchantLoop(information.merchant.name, REGION, IDENTIFIER).catch(() => { /* ignore errors */ })

    const startPriestLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.priest.bot) await information.priest.bot.disconnect()
                information.priest.bot = await AL.Game.startPriest(name, region, identifier)
                information.friends[1] = information.priest.bot
                preparePriest(information.priest.bot)
                information.priest.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.priest.bot) await information.priest.bot.disconnect()
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
    startPriestLoop(information.priest.name, REGION, IDENTIFIER).catch(() => { /* ignore errors */ })

    const startRangerLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.ranger.bot) await information.ranger.bot.disconnect()
                information.ranger.bot = await AL.Game.startRanger(name, region, identifier)
                information.friends[2] = information.ranger.bot
                prepareRanger(information.ranger.bot)
                information.ranger.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.ranger.bot) await information.ranger.bot.disconnect()
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
    startRangerLoop(information.ranger.name, REGION, IDENTIFIER).catch(() => { /* ignore errors */ })

    const startWarriorLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.warrior.bot) await information.warrior.bot.disconnect()
                information.warrior.bot = await AL.Game.startWarrior(name, region, identifier)
                information.friends[3] = information.warrior.bot
                prepareWarrior(information.warrior.bot)
                information.warrior.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.warrior.bot) await information.warrior.bot.disconnect()
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
    startWarriorLoop(information.warrior.name, REGION, IDENTIFIER).catch(() => { /* ignore errors */ })
}
run()