import { EntityModel } from "./database/entities/entities.model"
import { ServerRegion, ServerIdentifier, MonsterName } from "./definitions/adventureland"
import { EntityData } from "./definitions/adventureland-server"
import { NodeData } from "./definitions/pathfinder"
import { Game, Mage, Merchant } from "./game"
import { Pathfinder } from "./pathfinder"
import { Tools } from "./tools"

const region: ServerRegion = "ASIA"
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

    let nextLocation: NodeData
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
            const target = await EntityModel.findOne({ serverRegion: region, serverIdentifier: identifier, type: "phoenix" }).lean().exec()
            if (target) {
                await bot.smartMove(target, { useBlink: true })
            } else {
                const locations = bot.locateMonsters("phoenix")
                if (n == 0) {
                    await bot.smartMove(locations[0]) // western main spawn
                } else if (n == 1) {
                    if (nextLocation == locations[1]) {
                        await bot.smartMove(locations[1]) // armadillo main spawn
                        nextLocation = locations[4]
                    } else {
                        await bot.smartMove(locations[4]) // bat cave spawn
                        nextLocation = locations[1]
                    }
                } else if (n == 2) {
                    if (nextLocation == locations[3]) {
                        await bot.smartMove(locations[3]) // minimush halloween spawn
                        nextLocation = locations[2]
                    } else {
                        await bot.smartMove(locations[2]) // spider main spawn
                        nextLocation = location[3]
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
                    (["armadillo", "bat", "bee", "crab", "crabx", "croc", "fieldgen0", "minimush", "poisio", "scorpion", "spider", "squig", "squigtoad"] as MonsterName[]).includes(entity.type)) {
                    target = entity
                }
            }

            await bot.attack(target.id)
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
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
    await Promise.all([Game.login("hyprkookeez@gmail.com", "notmyrealpassword"), Pathfinder.prepare()])

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