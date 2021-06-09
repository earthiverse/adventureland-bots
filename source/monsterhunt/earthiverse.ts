import AL from "alclient-mongo"
import { goToAggroMonster, goToNearestWalkableToMonster, goToSpecialMonster, moveInCircle } from "../base/general.js"
import { attackTheseTypes } from "../base/ranger.js"
import { Information, Strategy } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION, startMerchant, startPriest, startRanger, startWarrior } from "./shared.js"

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
            attack: async () => { await attackTheseTypes(bot, ["bat"], information.friends) },
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
            attack: async () => { await attackTheseTypes(bot, ["bee"], information.friends) },
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
            requirePriest: true
        },
        cgoo: {
            attack: async () => { return attackTheseTypes(bot, ["cgoo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { goToNearestWalkableToMonster(bot, ["cgoo"], { map: "arena", x: 0, y: -500 }) },
        },
        crab: {
            attack: async () => { return attackTheseTypes(bot, ["crab"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -1202, y: -66 }) },
        },
        crabx: {
            attack: async () => { return attackTheseTypes(bot, ["crabx"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { goToNearestWalkableToMonster(bot, ["crabx"], { map: "main", x: -1202, y: -66 }) },
        },
        croc: {
            attack: async () => { return attackTheseTypes(bot, ["croc"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 801, y: 1710 }) },
        },
        cutebee: {
            attack: async () => { return attackTheseTypes(bot, ["cutebee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => {
                const nearby = bot.getNearestMonster("cutebee")
                if (nearby) {
                    if (!nearby.monster.target) {
                        // The cutebee will avoid 99.9% of our attacks, so let's try to walk in front of it so that we can aggro it
                        goToAggroMonster(bot, nearby.monster)
                    } else {
                        goToNearestWalkableToMonster(bot, ["cutebee"])
                    }
                } else {
                    await goToSpecialMonster(bot, "cutebee")
                }
            }
        },
        dragold: {
            attack: async () => { return attackTheseTypes(bot, ["dragold"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "dragold") },
            requirePriest: true
        },
        fireroamer: {
            attack: async () => { return attackTheseTypes(bot, ["fireroamer"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "desertland", x: 160, y: -675 }) },
            requirePriest: true
        },
        franky: {
            attack: async () => { return attackTheseTypes(bot, ["nerfedmummy", "franky"], information.friends) },
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => {
                const nearest = bot.getNearestMonster("franky")
                if (nearest && nearest.distance > 25) {
                    // Move close to Franky because other characters might help blast away mummies
                    await bot.smartMove(nearest.monster, { getWithin: 25 })
                } else {
                    await goToSpecialMonster(bot, "franky")
                }
            }
        },
        fvampire: {
            attack: async () => { return attackTheseTypes(bot, ["fvampire"], information.friends) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "fvampire") },
            requirePriest: true
        },
        ghost: {
            attack: async () => { return attackTheseTypes(bot, ["ghost"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "halloween", x: 256, y: -1224 }) }
        },
        goldenbat: {
            attack: async () => { return attackTheseTypes(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { return attackTheseTypes(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -32, y: 787 }) },
        },
        greenjr: {
            attack: async () => { return attackTheseTypes(bot, ["greenjr"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove("greenjr") },
        },
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
    startMerchantLoop(information.merchant.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })

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
    startPriestLoop(information.priest.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })

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
    startRangerLoop(information.ranger.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })

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
    startWarriorLoop(information.warrior.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })
}
run()