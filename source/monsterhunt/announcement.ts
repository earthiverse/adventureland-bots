import AL from "alclient-mongo"
import { startTrackerLoop } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { Information, Strategy } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION, startMage, startMerchant } from "./shared.js"

const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        bot: undefined,
        name: "facilitating",
        target: undefined
    },
    bot2: {
        bot: undefined,
        name: "gratuitously",
        target: undefined
    },
    bot3: {
        bot: undefined,
        name: "hypothesized",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: "decisiveness",
        nameAlt: "decisiveness",
        target: undefined
    }
}

function prepareMage(bot: AL.Mage) {
    const strategy: Strategy = {
        bee: {
            attack: async () => { await attackTheseTypesMage(bot, ["bee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", offhand: "wbook0" },
            move: async () => {
                if (bot.id == information.bot1.name) {
                    await bot.smartMove({ map: "main", x: 152, y: 1487 })
                } else if (bot.id == information.bot2.name) {
                    await bot.smartMove({ map: "main", x: 152 - 50, y: 1487 })
                } else if (bot.id == information.bot3.name) {
                    await bot.smartMove({ map: "main", x: 152 + 50, y: 1487 })
                }
            }
        }
    }

    startMage(bot, information, strategy)
}

function prepareMerchant(bot: AL.Merchant) {
    const strategy: Strategy = {
    }

    startMerchant(bot, information, strategy, { map: "main", x: -100, y: 0 })
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

    const startMage1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot1.bot) await information.bot1.bot.disconnect()
                information.bot1.bot = await AL.Game.startMage(name, region, identifier)
                information.friends[1] = information.bot1.bot
                prepareMage(information.bot1.bot as AL.Mage)
                startTrackerLoop(information.bot1.bot)
                information.bot1.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot1.bot) await information.bot1.bot.disconnect()
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
    startMage1Loop(information.bot1.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })

    const startMage2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot2.bot) await information.bot2.bot.disconnect()
                information.bot2.bot = await AL.Game.startMage(name, region, identifier)
                information.friends[2] = information.bot2.bot
                prepareMage(information.bot2.bot as AL.Mage)
                information.bot2.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot2.bot) await information.bot2.bot.disconnect()
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
    startMage2Loop(information.bot2.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })

    const startMage3Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot3.bot) await information.bot3.bot.disconnect()
                information.bot3.bot = await AL.Game.startMage(name, region, identifier)
                information.friends[3] = information.bot3.bot
                prepareMage(information.bot3.bot as AL.Mage)
                information.bot3.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot3.bot) await information.bot3.bot.disconnect()
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
    startMage3Loop(information.bot3.name, DEFAULT_REGION, DEFAULT_IDENTIFIER).catch(() => { /* ignore errors */ })
}
run()