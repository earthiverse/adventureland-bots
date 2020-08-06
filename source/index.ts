import { Game } from "./game.js"
import { Bot, RangerBot } from "./bot.js"
import { Tools } from "./tools.js"
import { EntityData } from "./definitions/adventureland-server.js"

async function startRanger(auth: string, character: string, user: string) {
    const game = new Game("EU", "I")
    await game.connect(auth, character, user)

    console.info(`Starting ranger (${character})!`)
    const bot = new RangerBot(game)

    bot.game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.game.disconnect()
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

            const targets: string[] = []
            // console.log(`# entities: ${bot.game.entities.size}`)
            for (const [id, entity] of bot.game.entities) {
                if (entity.type != "crabx") continue // Only attack large crabs
                if (entity.hp < entity.max_hp) {
                    continue // Only attack those with full HP
                }
                if (Tools.distance(bot.game.character, entity) > bot.game.character.range) continue // Only attack those in range

                targets.push(id)
            }

            let nearbyPlayer = false
            for (const player of bot.game.players.values()) {
                if (player.ctype == "merchant") continue // Merchants can't do enough damage their first attack to mess with us
                if (player.npc) continue // NPCs can't mess with us
                if (Tools.distance(bot.game.character, player) > 300) continue // Far enough away that they probably won't mess with us (unless they're deliberately trying to mess with us using supershot)
                if (player.id != "earthiverse"
                    && player.id != "earthMer"
                    && player.id != "earthMag"
                    && player.id != "earthMag2") {
                    nearbyPlayer = true
                    break
                }
            }

            if (!nearbyPlayer) {
            if (targets.length >= 5 && bot.game.character.mp >= bot.game.G.skills["5shot"].mp) {
                await bot.fiveShot(targets[0], targets[1], targets[2], targets[3], targets[4])
            } else if (targets.length >= 3 && bot.game.character.mp >= bot.game.G.skills["3shot"].mp) {
                await bot.threeShot(targets[0], targets[1], targets[2])
            } else if (targets.length > 0 && bot.game.character.mp >= bot.game.character.mp_cost) {
                await bot.attack(targets[0])
            }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(bot.getCooldown("attack"), 10))
    }
    attackLoop()

    async function moveLoop() {
        setTimeout(async () => { moveLoop() }, 250)

        try {
            // Find the closest crabx
            let closest: EntityData
            let closestD = Number.MAX_VALUE
            for (const entity of bot.game.entities.values()) {
                if (entity.type != "crabx") continue // Only target crabs
                if (entity.hp < entity.max_hp) continue // Only target full hp crabs

                const distance = Tools.distance(bot.game.character, entity)
                if (distance < closestD) {
                    closest = entity
                    closestD = distance
                }
            }

            if (closest && (closestD < 30 || closestD > 90)) {
                const angle = Math.atan2(bot.game.character.y - closest.y, bot.game.character.x - closest.x)
                const x = bot.game.character.x - Math.cos(angle) * (closestD - 60)
                const y = bot.game.character.y - Math.sin(angle) * (closestD - 60)

                await bot.move(x, y).catch()
            }
        } catch (e) {
            //console.error(e)
        }
    }
    moveLoop()

    async function healLoop() {
        try {
            if (!bot.game.active) return

            if (bot.getCooldown("use_hp")) {
                console.info(`heal is on cooldown ${bot.getCooldown("use_hp")}`)
                setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))
                return
            }

            const missingHP = bot.game.character.max_hp - bot.game.character.hp
            const missingMP = bot.game.character.max_mp - bot.game.character.mp
            const hpRatio = bot.game.character.hp / bot.game.character.max_hp
            const mpRatio = bot.game.character.mp / bot.game.character.max_mp
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && bot.hasItem("hpot1")) {
                    await bot.useHPPot(await bot.locateItem("hpot1"))
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && bot.hasItem("mpot1")) {
                    const mppot1 = await bot.locateItem("mpot1")
                    await bot.useMPPot(mppot1)
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && bot.hasItem("hpot1")) {
                    await bot.useHPPot(await bot.locateItem("hpot1"))
                } else {
                    await bot.regenHP()
                }
            }
        } catch (e) {
            //console.error(e)
        }

        setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))
    }
    healLoop()

    async function lootLoop() {
        try {
            for (const id of bot.game.chests.keys()) {
                bot.game.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function sendItemLoop() {
        try {
            if (bot.game.players.has("earthMer")) {
                const merchant = bot.game.players.get("earthMer")
                const distance = Tools.distance(bot.game.character, merchant)
                if (distance < 400) {
                    for (let i = 3; i < bot.game.character.items.length; i++) {
                        const item = bot.game.character.items[i]
                        if (!item) continue

                        await bot.sendItem("earthMer", i, item.q)
                        break // Only send one item at a time
}
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()
}

async function startMage(auth: string, character: string, user: string) {
    const game = new Game("EU", "I")
    await game.connect(auth, character, user)

    console.info(`Starting mage (${character})!`)
    const bot = new Bot(game)

    bot.game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.game.disconnect()
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

            const targets: string[] = []
            for (const [id, entity] of bot.game.entities) {
                if (entity.type != "crabx") continue // Only attack large crabs
                if (entity.hp == entity.max_hp) continue // Only attack those that are damaged
                if (entity.s.burned) continue // Don't attack monsters that are burning
                if (Tools.distance(bot.game.character, entity) > bot.game.character.range) continue // Only attack those in range

                targets.push(id)
            }

            if (targets.length > 0 && bot.game.character.mp >= bot.game.character.mp_cost) {
                await bot.attack(targets[0])
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(bot.getCooldown("attack"), 10))
    }
    attackLoop()

    async function moveLoop() {
        setTimeout(async () => { moveLoop() }, 250)

        try {
            // Find the closest crabx
            if (bot.game.players.has("earthiverse")) {
                const earthiverse = bot.game.players.get("earthiverse")
                const distance = Tools.distance(earthiverse, bot.game.character)

                if (earthiverse && distance > 60) {
                    const x = earthiverse.x + (-15 + Math.random() * 30)
                    const y = earthiverse.y + (-15 + Math.random() * 30)

                    await bot.move(x, y)
                }
            }
        } catch (e) {
            // console.error(e)
        }
    }
    moveLoop()

    async function healLoop() {
        try {
            if (!bot.game.active) return

            if (bot.getCooldown("use_hp")) {
                console.info(`heal is on cooldown ${bot.getCooldown("use_hp")}`)
                setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))
                return
            }

            const missingHP = bot.game.character.max_hp - bot.game.character.hp
            const missingMP = bot.game.character.max_mp - bot.game.character.mp
            const hpRatio = bot.game.character.hp / bot.game.character.max_hp
            const mpRatio = bot.game.character.mp / bot.game.character.max_mp
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && bot.hasItem("hpot1")) {
                    await bot.useHPPot(await bot.locateItem("hpot1"))
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && bot.hasItem("mpot1")) {
                    await bot.useMPPot(await bot.locateItem("mpot1"))
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && bot.hasItem("hpot1")) {
                    await bot.useHPPot(await bot.locateItem("hpot1"))
                } else {
                    await bot.regenHP()
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))
    }
    healLoop()

    async function lootLoop() {
        try {
            for (const id of bot.game.chests.keys()) {
                bot.game.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function sendItemLoop() {
        try {
            if (bot.game.players.has("earthMer")) {
                const merchant = bot.game.players.get("earthMer")
                const distance = Tools.distance(bot.game.character, merchant)
                if (distance < 400) {
                    for (let i = 3; i < bot.game.character.items.length; i++) {
                        const item = bot.game.character.items[i]
                        if (!item) continue

                        await bot.sendItem("earthMer", i, item.q)
                        break // Only send one item at a time
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()
}

async function run() {
    startRanger("secret!", "secret?", "secret?") //earthiverse
    startMage("secret!", "secret?", "secret?") //earthMag
    startMage("secret!", "secret?", "secret?") //earthMag2
}

run()