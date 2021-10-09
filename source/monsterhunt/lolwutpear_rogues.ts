import AL, { GMap, Merchant, Rogue } from "alclient"
import { goToNearestWalkableToMonster, goToSpecialMonster, sleep, startTrackerLoop } from "../base/general.js"
import { mainBeesNearTunnel } from "../base/locations.js"
import { attackTheseTypesRogue } from "../base/rogue.js"
import { getTargetServerFromPlayer } from "../base/serverhop.js"
import { Information, Strategy } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION, startRogue, startMerchant } from "./shared.js"

let TARGET_REGION = DEFAULT_REGION
let TARGET_IDENTIFIER = DEFAULT_IDENTIFIER

const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        bot: undefined,
        name: "rule34",
        target: undefined
    },
    bot2: {
        bot: undefined,
        name: "gaben",
        target: undefined
    },
    bot3: {
        bot: undefined,
        name: "wombocombo",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: "orlyowl",
        nameAlt: "orlyowl",
        target: undefined
    }
}

function prepareRogue(bot: Rogue) {
    const strategy: Strategy = {
        defaultTarget: "goo",
        // eslint-disable-next-line sort-keys
        bee: {
            attack: async () => { await attackTheseTypesRogue(bot, ["bee"], information.friends) },
            attackWhileIdle: true,
            equipment: { orb: "test_orb" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["bee"], mainBeesNearTunnel) },
        },
        crab: {
            attack: async () => { await attackTheseTypesRogue(bot, ["crab"], information.friends) },
            attackWhileIdle: true,
            equipment: { orb: "test_orb" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["crab"], mainBeesNearTunnel) },
        },
        croc: {
            attack: async () => { await attackTheseTypesRogue(bot, ["croc"], information.friends) },
            attackWhileIdle: true,
            equipment: { orb: "test_orb" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["croc"], mainBeesNearTunnel) },
        },
        franky: {
            attack: async () => { await attackTheseTypesRogue(bot, ["nerfedmummy", "franky"], information.friends) },
            equipment: { orb: "test_orb" },
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
        goldenbat: {
            attack: async () => { await attackTheseTypesRogue(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            equipment: { orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { await attackTheseTypesRogue(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            equipment: { orb: "test_orb" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["goo"], mainBeesNearTunnel) },
        },
        greenjr: {
            attack: async () => { await attackTheseTypesRogue(bot, ["greenjr", "snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            equipment: { orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "greenjr") },
        },
        jr: {
            attack: async () => { await attackTheseTypesRogue(bot, ["jr"], information.friends) },
            attackWhileIdle: true,
            equipment: { orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "jr") },
        },
        mrgreen: {
            attack: async () => { await attackTheseTypesRogue(bot, ["mrgreen"], information.friends) },
            equipment: { orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "mrgreen") },
        },
        mrpumpkin: {
            attack: async () => { await attackTheseTypesRogue(bot, ["mrpumpkin"], information.friends) },
            equipment: { orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "mrpumpkin") },
        },
        mvampire: {
            attack: async () => { await attackTheseTypesRogue(bot, ["mvampire", "bat"], information.friends) },
            attackWhileIdle: true,
            equipment: { orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "mvampire") },
        },
        slenderman: {
            attack: async () => { await attackTheseTypesRogue(bot, ["slenderman"], information.friends) },
            attackWhileIdle: true,
            equipment: { orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "slenderman") },
        },
        snowman: {
            attack: async () => { await attackTheseTypesRogue(bot, ["snowman"], information.friends) },
            equipment: { orb: "test_orb" },
            move: async () => { await goToSpecialMonster(bot, "snowman") }
        }
    }

    startRogue(bot, information, strategy)
}

function prepareMerchant(bot: Merchant) {
    const strategy: Strategy = {
    }

    startMerchant(bot, information, strategy, { map: "main", x: -250, y: -100 })
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")

    const startMerchantLoop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.merchant.bot) information.merchant.bot.disconnect()
                if (TARGET_REGION == DEFAULT_REGION && TARGET_IDENTIFIER == DEFAULT_IDENTIFIER) {
                    information.merchant.bot = await AL.Game.startMerchant(information.merchant.name, TARGET_REGION, TARGET_IDENTIFIER)
                } else {
                    information.merchant.bot = await AL.Game.startMerchant(information.merchant.nameAlt, TARGET_REGION, TARGET_IDENTIFIER)
                }
                information.friends[0] = information.merchant.bot
                prepareMerchant(information.merchant.bot)
                information.merchant.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.merchant.bot) information.merchant.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startMerchantLoop().catch(() => { /* ignore errors */ })

    const startRogue1Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot1.bot) information.bot1.bot.disconnect()
                information.bot1.bot = await AL.Game.startRogue(information.bot1.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[1] = information.bot1.bot
                prepareRogue(information.bot1.bot as Rogue)
                startTrackerLoop(information.bot1.bot)
                information.bot1.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot1.bot) information.bot1.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startRogue1Loop().catch(() => { /* ignore errors */ })

    const startRogue2Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot2.bot) information.bot2.bot.disconnect()
                information.bot2.bot = await AL.Game.startRogue(information.bot2.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[2] = information.bot2.bot
                prepareRogue(information.bot2.bot as Rogue)
                information.bot2.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot2.bot) information.bot2.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startRogue2Loop().catch(() => { /* ignore errors */ })

    const startRogue3Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot3.bot) information.bot3.bot.disconnect()
                information.bot3.bot = await AL.Game.startRogue(information.bot3.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[3] = information.bot3.bot
                prepareRogue(information.bot3.bot as Rogue)
                information.bot3.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot3.bot) information.bot3.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startRogue3Loop().catch(() => { /* ignore errors */ })

    let lastServerChangeTime = Date.now()
    const serverLoop = async () => {
        try {
            console.log("DEBUG: Checking target server...")
            // We haven't logged in yet
            if (!information.bot1.bot) {
                console.log("DEBUG: We haven't logged in yet")
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Don't change servers too fast
            if (lastServerChangeTime > Date.now() - AL.Constants.RECONNECT_TIMEOUT_MS) {
                console.log("DEBUG: Don't change servers too fast")
                setTimeout(async () => { serverLoop() }, Math.max(1000, lastServerChangeTime + AL.Constants.RECONNECT_TIMEOUT_MS - Date.now()))
                return
            }

            // Don't change servers if we're currently attacking something special.
            if ((!information.bot1.bot.S?.halloween && !information.bot1.bot.S?.holidayseason)
                && (AL.Constants.SPECIAL_MONSTERS.includes(information.bot1.target)
                || AL.Constants.SPECIAL_MONSTERS.includes(information.bot2.target)
                || AL.Constants.SPECIAL_MONSTERS.includes(information.bot3.target))) {
                console.log(`DEBUG: We are targeting something special (${information.bot1.target}, ${information.bot2.target}, ${information.bot3.target})`)
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Don't change servers if we're running a crypt
            const merchantMap: GMap = AL.Game.G.maps[information.merchant?.bot?.map]
            if (merchantMap && merchantMap.instance) {
                console.log("DEBUG: Merchant is in an instance")
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            const currentRegion = information.bot1.bot.server.region
            const currentIdentifier = information.bot1.bot.server.name

            const targetServer = await getTargetServerFromPlayer(currentRegion, currentIdentifier, "earthiverse")
            if (currentRegion == targetServer[0] && currentIdentifier == targetServer[1]) {
                // We're already on the correct server
                console.log("DEBUG: We're already on the correct server")
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Change servers to attack this entity
            TARGET_REGION = targetServer[0]
            TARGET_IDENTIFIER = targetServer[1]
            console.log(`Changing from ${currentRegion} ${currentIdentifier} to ${TARGET_REGION} ${TARGET_IDENTIFIER}`)

            // Loot all of our remaining chests
            await sleep(1000)
            console.log("Looting remaining chests")
            for (const [, chest] of information.bot1.bot.chests) {
                await information.bot1.bot.openChest(chest.id)
            }
            await sleep(1000)

            // Disconnect everyone
            console.log("Disconnecting characters")
            information.bot1.bot.disconnect(),
            information.bot2.bot?.disconnect(),
            information.bot3.bot?.disconnect(),
            information.merchant.bot?.disconnect()
            await sleep(5000)
            lastServerChangeTime = Date.now()
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { serverLoop() }, 1000)
    }
    serverLoop()
}
run()