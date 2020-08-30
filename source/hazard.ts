import { PingCompensatedGame as Game } from "./game.js"
import { Bot, WarriorBot } from "./bot.js"
import { Tools } from "./tools.js"
import { ServerRegion, ServerIdentifier } from "./definitions/adventureland.js"

async function startWarrior(auth: string, character: string, user: string, server: ServerRegion, identifier: ServerIdentifier) {
    const game = new Game(server, identifier)
    await game.connect(auth, character, user)

    console.info(`Starting warrior (${character})!`)
    const bot = new WarriorBot(game)

    bot.game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.game.disconnect()
    })

    async function agitateLoop() {
        try {
            if (!bot.game.active) return

            let numTargeting = 0
            let closeTargets = 0
            for (const entity of game.entities.values()) {
                if (entity.target == game.character.id) {
                    numTargeting++
                    continue
                }
                if (Tools.distance(game.character, entity) <= game.G.skills.agitate.range
                    && !entity.target
                    && entity.type == "scorpion") {
                    closeTargets++
                }
            }

            if (closeTargets > 0 && numTargeting + closeTargets < 3) {
                // Taunt no more than 3 enemies
                await bot.agitate()
            } else if(closeTargets > 0 && game.character.hp / game.character.max_hp > 0.75) {
                // Taunt all enemies if we have a lot of HP
                await bot.agitate()
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { agitateLoop() }, Math.max(bot.getCooldown("agitate"), 10))
    }
    agitateLoop()

    async function healLoop() {
        try {
            if (!bot.game.active) return

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

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
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

    async function tauntLoop() {
        try {
            if (!bot.game.active) return

            let numTargeting = 0
            const closeTargets: string[] = []
            for (const entity of game.entities.values()) {
                if (entity.target == game.character.id) {
                    numTargeting++
                    continue
                }
                if (Tools.distance(game.character, entity) <= game.G.skills.taunt.range
                    && !entity.target
                    && entity.type == "scorpion") {
                    closeTargets.push(entity.id)
                }
            }

            // Taunt a new enemy if we can
            if (numTargeting < 3 && closeTargets.length > 0) {
                await bot.taunt(closeTargets[0])
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { tauntLoop() }, Math.max(bot.getCooldown("taunt"), 10))
    }
    tauntLoop()
}

async function startMage(auth: string, character: string, user: string, server: ServerRegion, identifier: ServerIdentifier) {
    const game = new Game(server, identifier)
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

            const targets: string[] = []
            for (const [id, entity] of bot.game.entities) {
                if (entity.type != "scorpion") continue // Only attack scorpions
                if (entity.target != "earthWar") continue // Only attack those attacking our warrior
                if (entity.s.burned) continue // Don't attack monsters that are burning
                if (Tools.distance(bot.game.character, entity) > bot.game.character.range) continue // Only attack those in range

                // Don't attack if there's a projectile going towards it
                let isTargetedbyProjectile = false
                for (const projectile of bot.game.projectiles.values()) {
                    if (projectile.target == id) {
                        isTargetedbyProjectile = true
                        break
                    }
                }
                if (isTargetedbyProjectile) continue

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

    async function healLoop() {
        try {
            if (!bot.game.active) return

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

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
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
    // NOTE: Move characters to scorpions on desertland before starting!

    // Used to taunt & agitate. Put the weapon you want to upgrade on this character.
    startWarrior("secret", "secret", "secret", "ASIA", "I") //earthWar
    // Used to attack the monsters. Put fire weapons on these characters.
    startMage("secret", "secret", "secret", "ASIA", "I") //earthMag
    startMage("secret", "secret", "secret", "ASIA", "I") //earthMag2
}

run()