import AL from "alclient-mongo"
import { goToAggroMonster, goToNearestWalkableToMonster, goToSpecialMonster, moveInCircle } from "../base/general.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
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
            attack: async () => { await attackTheseTypesRanger(bot, ["arcticbee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 1082, y: -873 }) },
        },
        armadillo: {
            attack: async () => { await attackTheseTypesRanger(bot, ["armadillo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 526, y: 1846 }) },
        },
        bat: {
            attack: async () => { await attackTheseTypesRanger(bot, ["bat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "cave", x: -194, y: -461 }) },
        },
        bbpompom: {
            attack: async () => { await attackTheseTypesRanger(bot, ["bbpompom"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "winter_cave", x: 51, y: -164 }) },
        },
        bee: {
            attack: async () => { await attackTheseTypesRanger(bot, ["bee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 494, y: 1101 }) },
        },
        bigbird: {
            attack: async () => { await attackTheseTypesRanger(bot, ["bee", "cutebee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 1343, y: 248 }) },
        },
        boar: {
            attack: async () => { await attackTheseTypesRanger(bot, ["boar"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 20, y: -1109 }) },
        },
        booboo: {
            attack: async () => { await attackTheseTypesRanger(bot, ["booboo"], information.friends) },
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 265, y: -645 }) },
        },
        bscorpion: {
            attack: async () => { return attackTheseTypesRanger(bot, ["bscorpion"], information.friends, { targetingPlayer: "earthPri" }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await moveInCircle(bot, bscorpionSpawn) },
            requirePriest: true
        },
        cgoo: {
            attack: async () => { return attackTheseTypesRanger(bot, ["cgoo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { goToNearestWalkableToMonster(bot, ["cgoo"], { map: "arena", x: 0, y: -500 }) },
        },
        crab: {
            attack: async () => { return attackTheseTypesRanger(bot, ["crab"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -1202, y: -66 }) },
        },
        crabx: {
            attack: async () => { return attackTheseTypesRanger(bot, ["crabx"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { goToNearestWalkableToMonster(bot, ["crabx"], { map: "main", x: -1202, y: -66 }) },
        },
        croc: {
            attack: async () => { return attackTheseTypesRanger(bot, ["croc"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 801, y: 1710 }) },
        },
        cutebee: {
            attack: async () => { return attackTheseTypesRanger(bot, ["cutebee"], information.friends) },
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
            attack: async () => { return attackTheseTypesRanger(bot, ["dragold"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "dragold") },
            requirePriest: true
        },
        fireroamer: {
            attack: async () => { return attackTheseTypesRanger(bot, ["fireroamer"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "desertland", x: 160, y: -675 }) },
            requirePriest: true
        },
        franky: {
            attack: async () => { return attackTheseTypesRanger(bot, ["nerfedmummy", "franky"], information.friends) },
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
            attack: async () => { return attackTheseTypesRanger(bot, ["fvampire"], information.friends) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "fvampire") },
            requirePriest: true
        },
        ghost: {
            attack: async () => { return attackTheseTypesRanger(bot, ["ghost"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "halloween", x: 256, y: -1224 }) }
        },
        goldenbat: {
            attack: async () => { return attackTheseTypesRanger(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { return attackTheseTypesRanger(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -32, y: 787 }) },
        },
        greenjr: {
            attack: async () => { return attackTheseTypesRanger(bot, ["greenjr"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove("greenjr") },
        },
        hen: {
            attack: async () => { return attackTheseTypesRanger(bot, ["hen"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -61.5, y: -282 }) },
        },
        iceroamer: {
            attack: async () => { return attackTheseTypesRanger(bot, ["iceroamer"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 1512, y: 104 }) },
        },
        jr: {
            attack: async () => { return attackTheseTypesRanger(bot, ["jr"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "jr") },
        },
        minimush: {
            attack: async () => { return attackTheseTypesRanger(bot, ["minimush"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "halloween", x: 8, y: 631 }) },
        },
        mole: {
            attack: async () => { return attackTheseTypesRanger(bot, ["mole"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "tunnel", x: -15, y: -329 }) },
            requirePriest: true
        },
        mrgreen: {
            attack: async () => { return attackTheseTypesRanger(bot, ["mrgreen"], information.friends) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "mrgreen") },
            requirePriest: true
        },
        mrpumpkin: {
            attack: async () => { return await attackTheseTypesRanger(bot, ["mrpumpkin"], information.friends) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "mrpumpkin") },
            requirePriest: true
        },
        mummy: {
            attack: async () => { return attackTheseTypesRanger(bot, ["mummy"], information.friends) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 250, y: -1129 }) },
            requirePriest: true
        },
        mvampire: {
            attack: async () => { return attackTheseTypesRanger(bot, ["mvampire"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "mvampire") },
        },
        nerfedmummy: {
            attack: async () => { return attackTheseTypesRanger(bot, ["nerfedmummy"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove("franky") },
        },
        oneeye: {
            attack: async () => { return attackTheseTypesRanger(bot, ["oneeye"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "level2w", x: -175, y: 0 }) },
            requirePriest: true,
        },
        osnake: {
            attack: async () => { return attackTheseTypesRanger(bot, ["osnake"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake"], { map: "halloween", x: -589, y: -335 }) },
        },
        phoenix: {
            attack: async () => { return attackTheseTypesRanger(bot, ["phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "phoenix") },
        },
        plantoid: {
            attack: async () => { return attackTheseTypesRanger(bot, ["plantoid"], information.friends) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "desertland", x: -750, y: -125 }) },
            requirePriest: true
        },
        poisio: {
            // TODO: If we can 1shot with hbow, use that instead
            attack: async () => { return await attackTheseTypesRanger(bot, ["poisio"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -121, y: 1360 }) },
        },
        porcupine: {
            attack: async () => { return attackTheseTypesRanger(bot, ["porcupine"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "desertland", x: -829, y: 135 }) },
        },
        pppompom: {
            attack: async () => { return attackTheseTypesRanger(bot, ["pppompom"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "level2n", x: 120, y: -170 }) },
            requirePriest: true
        },
        prat: {
            attack: async () => { return attackTheseTypesRanger(bot, ["prat"], information.friends) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "level1", x: -280, y: 541 }) },
            requirePriest: true
        },
        rat: {
            // TODO: Optimize positioning
            attack: async () => { return attackTheseTypesRanger(bot, ["rat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "mansion", x: 100, y: -225 }) },
        },
        rooster: {
            attack: async () => { return attackTheseTypesRanger(bot, ["rooster"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -61.5, y: -282 }) },
        },
        scorpion: {
            attack: async () => { return attackTheseTypesRanger(bot, ["scorpion"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 1578, y: -168 }) },
        },
        skeletor: {
            attack: async () => { return attackTheseTypesRanger(bot, ["skeletor"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "arena", x: 380, y: -575 }) },
            requirePriest: true,
        },
        snake: {
            attack: async () => { return attackTheseTypesRanger(bot, ["snake"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -82, y: 1901 }) },
        },
        snowman: {
            attack: async () => { return attackTheseTypesRanger(bot, ["snowman"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "hbow", orb: "orbofdex" },
            move: async () => { await goToSpecialMonster(bot, "snowman") },
        },
        spider: {
            attack: async () => { return attackTheseTypesRanger(bot, ["spider"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: 948, y: -144 }) },
        },
        squig: {
            attack: async () => { return attackTheseTypesRanger(bot, ["squig"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -1175, y: 422 }) },
        },
        squigtoad: {
            attack: async () => { return attackTheseTypesRanger(bot, ["squigtoad"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "main", x: -1175, y: 422 }) },
        },
        stoneworm: {
            attack: async () => { return attackTheseTypesRanger(bot, ["stoneworm"], information.friends) },
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 677, y: 129 }) },
        },
        tinyp: {
            attack: async () => { return attackTheseTypesRanger(bot, ["tinyp"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "tinyp") },
        },
        tortoise: {
            attack: async () => { return attackTheseTypesRanger(bot, ["tortoise"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["tortoise"], { map: "main", x: -1124, y: 1118 }) },
        },
        wabbit: {
            attack: async () => { return attackTheseTypesRanger(bot, ["wabbit"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "wabbit") }
        },
        wolf: {
            attack: async () => { return attackTheseTypesRanger(bot, ["wolf"], information.friends) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 400, y: -2525 }) },
            requirePriest: true
        },
        wolfie: {
            attack: async () => { return await attackTheseTypesRanger(bot, ["wolfie"], information.friends) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["wolfie"], { map: "winterland", x: -169, y: -2026 }) },
            requirePriest: true
        },
        xscorpion: {
            attack: async () => { return await attackTheseTypesRanger(bot, ["xscorpion"], information.friends, { targetingPlayer: information.warrior.name }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "halloween", x: -325, y: 775 }) },
            requirePriest: true
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