import AL from "alclient-mongo"

const rangerName = "earthiverse"
const priest1Name = "earthPri"
const priest2Name = "earthPri2"
const merchantName = "earthMer"

const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "I"

let merchant: AL.Merchant
let ranger: AL.Ranger
let priest1: AL.Priest
let priest2: AL.Priest

async function baseStrategy(bot: AL.PingCompensatedCharacter) {
    async function healLoop() {
        try {
            if (!bot.rip) {
                const missingHP = bot.max_hp - bot.hp
                const missingMP = bot.max_mp - bot.mp
                const hpRatio = bot.hp / bot.max_hp
                const mpRatio = bot.mp / bot.max_mp
                const hpot1 = bot.locateItem("hpot1")
                const hpot0 = bot.locateItem("hpot0")
                const mpot1 = bot.locateItem("mpot1")
                const mpot0 = bot.locateItem("mpot0")
                if (hpRatio < mpRatio) {
                    if (missingHP >= 400 && hpot1 !== undefined) {
                        await bot.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await bot.useHPPot(hpot0)
                    } else {
                        await bot.regenHP()
                    }
                } else if (mpRatio < hpRatio) {
                    if (missingMP >= 500 && mpot1 !== undefined) {
                        await bot.useMPPot(mpot1)
                    } else if (missingMP >= 300 && mpot0 !== undefined) {
                        await bot.useMPPot(mpot0)
                    } else {
                        await bot.regenMP()
                    }
                } else if (hpRatio < 1) {
                    if (missingHP >= 400 && hpot1 !== undefined) {
                        await bot.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await bot.useHPPot(hpot0)
                    } else {
                        await bot.regenHP()
                    }
                }
            }

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
    }
    healLoop()
}

async function startRanger(ranger: AL.Ranger) {
    baseStrategy(ranger)
}

async function startPriest(priest: AL.Priest, number: 1 | 2) {
    baseStrategy(priest)
}

async function startMerchant(merchant: AL.Merchant) {
    baseStrategy(merchant)
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Pathfinder.prepare()])

    // Start all characters
    console.log("Connecting...")
    const merchantP = AL.Game.startMerchant(merchantName, region, identifier)
    const rangerP = AL.Game.startRanger(rangerName, region, identifier)
    const priest1P = AL.Game.startPriest(priest1Name, region, identifier)
    const priest2P = AL.Game.startPriest(priest2Name, region, identifier)
    merchant = await merchantP
    ranger = await rangerP
    priest1 = await priest1P
    priest2 = await priest2P

    // Set up functionality to reconnect if we disconnect
    const reconnect = async (bot: AL.PingCompensatedCharacter) => {
        console.log(`Reconnecting ${bot.id}...`)
        try {
            await bot.disconnect()
            await new Promise(resolve => setTimeout(resolve, 1000))
            await bot.connect()
            bot.socket.on("disconnect", async () => { await reconnect(bot) })
        } catch (e) {
            console.error(e)
            await new Promise(resolve => setTimeout(resolve, 1000))
            reconnect(bot)
        }
    }
    merchant.socket.on("disconnect", async () => { await reconnect(merchant) })
    ranger.socket.on("disconnect", async () => { await reconnect(ranger) })
    priest1.socket.on("disconnect", async () => { await reconnect(priest1) })
    priest2.socket.on("disconnect", async () => { await reconnect(priest2) })

    // Start the characters
    startMerchant(merchant)
    startRanger(ranger)
    startPriest(priest1, 1)
    startPriest(priest2, 2)
}
run()