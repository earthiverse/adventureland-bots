import AL from "alclient"
import { goToSpecialMonster, sleep, startTrackerLoop } from "../base/general.js"
import { mainBeesNearTunnel, mainGoos, offsetPosition } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { getTargetServerFromMonsters } from "../base/serverhop.js"
import { Information, Strategy } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION, startMage, startMerchant } from "./shared.js"

const TARGET_REGION = DEFAULT_REGION
const TARGET_IDENTIFIER = DEFAULT_IDENTIFIER

const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        bot: undefined,
        name: "lolwutpear",
        target: undefined
    },
    bot2: {
        bot: undefined,
        name: "ytmnd",
        target: undefined
    },
    bot3: {
        bot: undefined,
        name: "shoopdawhoop",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: "orlyowl",
        nameAlt: "orlyowl",
        target: undefined
    }
}

function prepareMage(bot: AL.Mage) {
    const strategy: Strategy = {
        bee: {
            attack: async () => { await attackTheseTypesMage(bot, ["bee"], information.friends, { cburstWhenHPLessThan: bot.G.monsters.bee.hp + 1 }) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", offhand: "wbook0" },
            move: async () => {
                if (bot.id == information.bot1.name) {
                    await bot.smartMove(offsetPosition(mainBeesNearTunnel, -25, 0), { useBlink: true })
                } else if (bot.id == information.bot2.name) {
                    await bot.smartMove(offsetPosition(mainBeesNearTunnel, -75, 0), { useBlink: true })
                } else if (bot.id == information.bot3.name) {
                    await bot.smartMove(offsetPosition(mainBeesNearTunnel, -125, 0), { useBlink: true })
                }
            }
        },
        goo: {
            attack: async () => { await attackTheseTypesMage(bot, ["goo"], information.friends, { cburstWhenHPLessThan: bot.G.monsters.goo.hp + 1 }) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", offhand: "wbook0" },
            move: async () => {
                if (bot.id == information.bot1.name) {
                    await bot.smartMove(offsetPosition(mainGoos, -50, 0), { useBlink: true })
                } else if (bot.id == information.bot2.name) {
                    await bot.smartMove(offsetPosition(mainGoos, -150, 0), { useBlink: true })
                } else if (bot.id == information.bot3.name) {
                    await bot.smartMove(offsetPosition(mainGoos, -250, 0), { useBlink: true })
                }
            }
        },
        snowman: {
            attack: async () => { await attackTheseTypesMage(bot, ["snowman"], information.friends) },
            equipment: { mainhand: "wand", offhand: "wbook0" },
            move: async () => { await goToSpecialMonster(bot, "snowman") }
        }
    }

    startMage(bot, information, strategy)
}

function prepareMerchant(bot: AL.Merchant) {
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
                if (information.merchant.bot) await information.merchant.bot.disconnect()
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
                if (information.merchant.bot) await information.merchant.bot.disconnect()
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

    const startMage1Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot1.bot) await information.bot1.bot.disconnect()
                information.bot1.bot = await AL.Game.startMage(information.bot1.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[1] = information.bot1.bot
                prepareMage(information.bot1.bot as AL.Mage)
                startTrackerLoop(information.bot2.bot)
                information.bot1.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot1.bot) await information.bot1.bot.disconnect()
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
    startMage1Loop().catch(() => { /* ignore errors */ })

    const startMage2Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot2.bot) await information.bot2.bot.disconnect()
                information.bot2.bot = await AL.Game.startMage(information.bot2.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[2] = information.bot2.bot
                prepareMage(information.bot2.bot as AL.Mage)
                information.bot2.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot2.bot) await information.bot2.bot.disconnect()
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
    startMage2Loop().catch(() => { /* ignore errors */ })

    const startMage3Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot3.bot) await information.bot3.bot.disconnect()
                information.bot3.bot = await AL.Game.startMage(information.bot3.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[3] = information.bot3.bot
                prepareMage(information.bot3.bot as AL.Mage)
                information.bot3.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot3.bot) await information.bot3.bot.disconnect()
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
    startMage3Loop().catch(() => { /* ignore errors */ })

    // let lastServerChangeTime = Date.now()
    // const serverLoop = async () => {
    //     try {
    //         // We haven't logged in yet
    //         if (!information.bot1) {
    //             setTimeout(async () => { serverLoop() }, 1000)
    //             return
    //         }

    //         // Don't change servers too fast
    //         if (lastServerChangeTime > Date.now() - 60_000) {
    //             setTimeout(async () => { serverLoop() }, Math.max(1000, lastServerChangeTime - Date.now() - 60_000))
    //             return
    //         }

    //         // Don't change servers if we're currently attacking something special.
    //         if (AL.Constants.SPECIAL_MONSTERS.includes(information.bot1.target)
    //             || AL.Constants.SPECIAL_MONSTERS.includes(information.bot2.target)
    //             || AL.Constants.SPECIAL_MONSTERS.includes(information.bot3.target)) {
    //             setTimeout(async () => { serverLoop() }, 1000)
    //             return
    //         }

    //         // Don't change servers if we're running a crypt
    //         const merchantMap: AL.GMap = AL.Game.G.maps[information.merchant?.bot?.map]
    //         if (merchantMap && merchantMap.instance) {
    //             setTimeout(async () => { serverLoop() }, 1000)
    //             return
    //         }

    //         const currentRegion = information.bot1.bot.server.region
    //         const currentIdentifier = information.bot1.bot.server.name
    //         const G = information.bot1.bot.G

    //         const targetServer = await getTargetServerFromMonsters(G, DEFAULT_REGION, DEFAULT_IDENTIFIER)
    //         if (currentRegion == targetServer[0] && currentIdentifier == targetServer[1]) {
    //             // We're already on the correct server
    //             setTimeout(async () => { serverLoop() }, 1000)
    //             return
    //         }

    //         // Change servers to attack this entity
    //         TARGET_REGION = targetServer[0]
    //         TARGET_IDENTIFIER = targetServer[1]
    //         console.log(`Changing from ${currentRegion} ${currentIdentifier} to ${TARGET_REGION} ${TARGET_IDENTIFIER}`)

    //         // Loot all of our remaining chests
    //         await sleep(1000)
    //         for (const [, chest] of information.bot1.bot.chests) await information.bot1.bot.openChest(chest.id)
    //         await sleep(1000)

    //         // Disconnect everyone
    //         await Promise.allSettled([
    //             information.bot1.bot.disconnect(),
    //             information.bot2.bot.disconnect(),
    //             information.bot3.bot.disconnect(),
    //             information.merchant.bot.disconnect()
    //         ])
    //         await sleep(5000)
    //         lastServerChangeTime = Date.now()
    //     } catch (e) {
    //         console.error(e)
    //     }

    //     setTimeout(async () => { serverLoop() }, 1000)
    // }
    // serverLoop()
}
run()