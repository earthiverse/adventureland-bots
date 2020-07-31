import dotenv from "dotenv"
import { Game } from "./game.js"
import { Bot } from "./bot.js"
import { ChestData } from "./definitions/adventureland-server.js"
import { SlotType, ItemName } from "./definitions/adventureland.js"

dotenv.config({ path: "../earthRan2.env" })
console.log([process.env.AUTH, process.env.CHARACTER, process.env.USER])

async function startRanger(auth: string, character: string, user: string) {
    const game = new Game("US", "I")
    await game.connect(auth, character, user)

    console.info("Starting bot!")
    const bot = new Bot(game)

    bot.game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.game.disconnect()
    })

    // Open chests as soon as they are dropped
    bot.game.socket.on("drop", (data: ChestData) => {
        bot.game.socket.emit("open_chest", { id: data.id })
    })

    async function attackLoop() {
        try {
            if (!bot.game.active) return

            // Cooldown check
            if (bot.getCooldown("attack")) {
                console.info(`attack is on cooldown ${bot.getCooldown("attack")}`)
                setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
                return
            }

            // Attack the nearest player
            const nearestPlayer = bot.getNearestAttackablePlayer()
            if (bot.isPVP() && nearestPlayer && nearestPlayer.distance < bot.game.character.range) {
                await bot.attack(nearestPlayer.player.id)
            } else {
                const nearestMonster = bot.getNearestMonster("goo")
                if (nearestMonster.distance <= bot.game.character.range) {
                    await bot.attack(nearestMonster.monster.id)
                }
            }

            // Attack
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
    }
    attackLoop()

    async function buyLoop() {
        try {
            if (!bot.game.active) return

            const purchases: Promise<any>[] = []

            // Buy healing items 
            let numHPPots = 0
            let numMPPots = 0
            for (const item of bot.game.character.items) {
                if (!item) continue
                if (item.name == "hpot1") {
                    numHPPots += item.q
                } else if (item.name == "mpot1") {
                    numMPPots += item.q
                }
            }
            if (numHPPots < 25) purchases.push(bot.buy("hpot1", 25 - numMPPots))
            if (numMPPots < 25) purchases.push(bot.buy("mpot1", 25 - numMPPots))

            // Find the lowest level item we currently have equipped
            let lowestLevel = 20
            let lowestSlot: SlotType = undefined
            for (const slot of ["mainhand", "chest", "pants", "shoes", "helmet", "gloves"] as SlotType[]) {
                const itemInfo = bot.game.character.slots[slot]
                if (!itemInfo) {
                    lowestSlot = slot
                    break
                }
                if (itemInfo.level < lowestLevel) {
                    lowestLevel = itemInfo.level
                    lowestSlot = slot
                }
            }

            // If we don't have an item in the inventory, buy one
            let hasItem = false
            for (const item of bot.game.character.items) {
                if (!item) continue
                if (lowestSlot == "mainhand" && item.name == "bow") {
                    hasItem = true
                    break
                }
                if (lowestSlot == "chest" && item.name == "coat") {
                    hasItem = true
                    break
                }
                if (lowestSlot == "pants" && item.name == "pants") {
                    hasItem = true
                    break
                }
                if (lowestSlot == "shoes" && item.name == "shoes") {
                    hasItem = true
                    break
                }
                if (lowestSlot == "helmet" && item.name == "helmet") {
                    hasItem = true
                    break
                }
                if (lowestSlot == "gloves" && item.name == "gloves") {
                    hasItem = true
                    break
                }
            }

            if (!hasItem) {
                if (lowestSlot == "mainhand") {
                    purchases.push(bot.buy("bow", 1))
                } else if (lowestSlot == "chest") {
                    purchases.push(bot.buy("coat", 1))
                } else if (lowestSlot == "pants") {
                    purchases.push(bot.buy("pants", 1))
                } else if (lowestSlot == "shoes") {
                    purchases.push(bot.buy("shoes", 1))
                } else if (lowestSlot == "helmet") {
                    purchases.push(bot.buy("helmet", 1))
                } else if (lowestSlot == "gloves") {
                    purchases.push(bot.buy("gloves", 1))
                }
            }

            const results = await Promise.allSettled(purchases)
            for (const result of results) {
                if (result.status == "rejected") console.error(result.reason)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { buyLoop() }, 500)
    }
    buyLoop()

    async function compoundLoop() {
        try {
            if (!bot.game.active) return

            const items: { [T in ItemName]?: { [T in string]?: number[] } } = {}
            for (let inventoryPos = 0; inventoryPos < bot.game.character.items.length; inventoryPos++) {
                const item = bot.game.character.items[inventoryPos]
                if (!item) return
                if (!bot.game.G.items[item.name].compound) return // Not compoundable

                if (!items[item.name]) items[item.name] = {}
                if (!items[item.name][item.level.toString()]) items[item.name][item.level.toString()] = []
                items[item.name][item.level.toString()].push(inventoryPos)
            }

            let compoundThese: { itemName: ItemName, itemLevel: number, inventoryPos: number[] }
            for (const name in items) {
                for (const level in items[name as ItemName]) {
                    if (items[name as ItemName][level].length >= 3) {
                        compoundThese = { itemName: name as ItemName, itemLevel: Number.parseInt(level), inventoryPos: items[name as ItemName][level] }
                        break
                    }
                }
                if (compoundThese) break
            }

            let cscroll: ItemName
            if (compoundThese) {
                for (let i = 0; i < bot.game.G.items[compoundThese.itemName].grades.length; i++) {
                    if (compoundThese.itemLevel <= bot.game.G.items[compoundThese.itemName].grades[i]) {
                        cscroll = `cscroll${i}` as ItemName
                    }
                }
                await bot.buy(cscroll, 1)
                const success = await bot.compound(compoundThese.inventoryPos[0], compoundThese.inventoryPos[1], compoundThese.inventoryPos[2], await bot.locateItem(cscroll))
                if (success) {
                    // Check if it's better than what we currently have
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { compoundLoop() }, 500)
    }
    compoundLoop()

    async function healLoop() {
        try {
            if (!bot.game.active) return

            if (bot.getCooldown("use_hp")) {
                console.info(`heal is on cooldown ${bot.getCooldown("use_hp")}`)
                setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))
                return
            }

            const hpRatio = bot.game.character.hp / bot.game.character.max_hp
            const mpRatio = bot.game.character.mp / bot.game.character.max_mp
            if (hpRatio < mpRatio) {
                await bot.regenHP()
            } else if (mpRatio < hpRatio) {
                await bot.regenMP()
            } else if (hpRatio < 1) {
                await bot.regenHP()
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))
    }
    healLoop()

    async function moveLoop() {
        try {
            if (!bot.game.active) return

            // TODO: Find optimal monster to farm

            // TODO: Move around
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 500)
    }
    moveLoop()

    async function respawnLoop() {
        try {
            if (!bot.game.active) return

            if (bot.game.character.rip) {
                // TODO: Respawn
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { respawnLoop() }, 500)
    }
    respawnLoop()

    async function upgradeLoop() {
        try {
            if (!bot.game.active) return

            // TODO: Buy upgrade scrolls

            // TODO: Upgrade things in inventory

            // TODO: Equip if it's higher than the one we currently have
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { upgradeLoop() }, 500)
    }
    upgradeLoop()
}

async function run() {
    startRanger(process.env.AUTH, process.env.CHARACTER, process.env.USER)
}

run()