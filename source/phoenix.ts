import { ITEMS_TO_BUY, ITEMS_TO_EXCHANGE, NPC_INTERACTION_DISTANCE } from "./constants.js"
import { EntityModel } from "./database/entities/entities.model.js"
import { ServerRegion, ServerIdentifier, MonsterName } from "./definitions/adventureland"
import { EntityData } from "./definitions/adventureland-server"
import { Game, Mage, Merchant } from "./game.js"
import { Pathfinder } from "./pathfinder.js"
import { Tools } from "./tools.js"

const region: ServerRegion = "EU"
const identifier: ServerIdentifier = "I"

const mages: Mage[] = []

async function startMage(bot: Mage, n: number) {
    const lastMagiportOffer: { [T in string]: number } = {}

    bot.socket.on("magiport", async (data: { name: string }) => {
        for (const mage of mages) {
            if (mage.character.id == data.name) {
                await bot.acceptMagiport(data.name)
                return
            }
        }
    })

    async function buyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.hasItem("computer")) {
                // Buy HP Pots
                const numHpot1 = bot.countItem("hpot1")
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = bot.countItem("mpot1")
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }

            for (const ponty of bot.locateNPCs("secondhands")) {
                if (Tools.distance(bot.character, ponty) > NPC_INTERACTION_DISTANCE) continue
                const pontyItems = await bot.getPontyItems()
                for (const item of pontyItems) {
                    if (!item) continue

                    if (
                        item.p // Buy all shiny/glitched/etc. items
                        || ITEMS_TO_BUY.includes(item.name) // Buy anything in our buy list
                    ) {
                        await bot.buyFromPonty(item)
                        continue
                    }
                }
            }

            // TODO: Look for buyable things on merchant
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 1000)
    }
    buyLoop()

    async function exchangeLoop() {
        try {
            // TODO: Make bot.canExchange() function and replace the following line with thatF
            const hasComputer = bot.locateItem("computer") !== undefined

            if (hasComputer) {
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item) continue
                    if (!ITEMS_TO_EXCHANGE.includes(item.name)) continue // Don't want / can't exchange

                    const gInfo = bot.G.items[item.name]
                    if (gInfo.e !== undefined && item.q < gInfo.e) continue // Don't have enough to exchange

                    await bot.exchange(i)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { exchangeLoop() }, 250)
    }
    exchangeLoop()

    async function healLoop() {
        try {
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
            const hpot1 = bot.locateItem("hpot1")
            const mpot1 = bot.locateItem("mpot1")
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && mpot1) {
                    await bot.useMPPot(mpot1)
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function lootLoop() {
        try {
            if (bot.socket.disconnected) return

            for (const [id, chest] of bot.chests) {
                if (Tools.distance(bot.character, chest) > 800) continue
                bot.openChest(id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function moveLoop() {
        try {
            // See if we are close to a phoenix
            for (const [, entity] of bot.entities) {
                if (entity.type !== "phoenix") continue
                if (Tools.distance(bot.character, entity) >= bot.character.range) {
                    await bot.smartMove(entity, { useBlink: true })
                } else if (entity.hp > entity.max_hp * 0.25) {
                    // Offer magiports to other mages
                    for (const mage of mages) {
                        if (mage.character.id == bot.character.id) continue // Don't offer a magiport to ourselves
                        if (bot.players.has(mage.character.id)) continue // Already close

                        // Offer magiport if they're far away
                        if (bot.canUse("magiport") && (!lastMagiportOffer[mage.character.id] || lastMagiportOffer[mage.character.id] < Date.now() - 30000)) {
                            lastMagiportOffer[mage.character.id] = Date.now()
                            bot.magiport(mage.character.id)
                        }
                    }
                }
                setTimeout(async () => { moveLoop() }, 250)
                return
            }

            // See if we have spotted a phoenix in our database
            const target = await EntityModel.findOne({ serverRegion: region, serverIdentifier: identifier, type: "phoenix", lastSeen: { $gt: Date.now() - 30000 } }).lean().exec()
            if (target) {
                await bot.smartMove(target, { useBlink: true })
            } else {
                const locations = bot.locateMonsters("phoenix")
                if (n == 0) {
                    await bot.smartMove(locations[2]) // western main spawn
                } else if (n == 1) {
                    if (Tools.distance(bot.character, locations[4]) < 250) {
                        await bot.smartMove(locations[1]) // armadillo main spawn
                    } else {
                        await bot.smartMove(locations[4]) // bat cave spawn
                    }
                } else if (n == 2) {
                    if (Tools.distance(bot.character, locations[0]) < 250) {
                        await bot.smartMove(locations[3]) // minimush halloween spawn
                    } else {
                        await bot.smartMove(locations[0]) // spider main spawn
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    async function attackLoop() {
        try {
            if (bot.character.targets > 2 && bot.canUse("scare")) {
                await bot.scare()
            }

            let target: EntityData
            for (const [, entity] of bot.entities) {
                if (entity.type == "phoenix") {
                    if (Tools.distance(bot.character, entity) < bot.character.range) target = entity
                    break
                }
                if (Tools.distance(bot.character, entity) < bot.character.range &&
                    (["armadillo", "bat", "bee", "crab", "crabx", "croc", "fieldgen0", "frog", "minimush", "poisio", "scorpion", "spider", "squig", "squigtoad", "tortoise"] as MonsterName[]).includes(entity.type)) {
                    target = entity
                }
            }

            if (bot.character.c.town) {
                if (target && target.type == "phoenix") {
                    bot.stopWarpToTown()
                } else {
                    setTimeout(async () => { attackLoop() }, 50)
                    return
                }
            }

            if (target && bot.canUse("attack")) {
                await bot.attack(target.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()
}

async function startMerchant(bot: Merchant) {
    async function healLoop() {
        try {
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
            const hpot1 = bot.locateItem("hpot1")
            const mpot1 = bot.locateItem("mpot1")
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && mpot1) {
                    await bot.useMPPot(mpot1)
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function lootLoop() {
        try {
            if (bot.socket.disconnected) return

            for (const [id, chest] of bot.chests) {
                if (Tools.distance(bot.character, chest) > 800) continue
                bot.openChest(id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()
}

async function run(region: ServerRegion, identifier: ServerIdentifier) {
    await Promise.all([Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpasswordlol"), Pathfinder.prepare()])

    const mage1 = await Game.startMage("earthMag", region, identifier)
    const mage2 = await Game.startMage("earthMag2", region, identifier)
    const mage3 = await Game.startMage("earthMag3", region, identifier)
    mages.push(mage1, mage2, mage3)
    const merchant = await Game.startMerchant("earthMer", region, identifier)

    // Disconnect if we have to
    mage1.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        Game.disconnect()
    })
    mage2.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        Game.disconnect()
    })
    mage3.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        Game.disconnect()
    })
    merchant.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        Game.disconnect()
    })

    // Start the bots!
    startMage(mage1, 0)
    startMage(mage2, 1)
    startMage(mage3, 2)
    startMerchant(merchant)
}
run(region, identifier)