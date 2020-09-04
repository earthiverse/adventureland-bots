import { PingCompensatedGame as Game } from "./game.js"
import { WarriorBot, MageBot, PriestBot } from "./bot.js"
import { Tools } from "./tools.js"
import { ServerRegion, ServerIdentifier } from "./definitions/adventureland.js"
import { PlayerData } from "./definitions/adventureland-server.js"

async function startWarrior(auth: string, character: string, user: string, server: ServerRegion, identifier: ServerIdentifier) {
    const game = new Game(server, identifier)
    await game.connect(auth, character, user)

    console.info(`Starting warrior (${game.character.id})!`)
    const bot = new WarriorBot(game)

    game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        game.disconnect()
    })

    game.socket.on("request", (data: { name: string }) => {
        bot.acceptPartyRequest(data.name)
    })

    async function agitateLoop() {
        try {
            if (!game.active) return

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

            if (closeTargets > 1 && numTargeting + closeTargets < 3) {
                // Taunt no more than 3 enemies
                await bot.agitate()
            } else if (closeTargets > 1 && game.character.hp / game.character.max_hp > 0.75) {
                // Taunt all enemies if we have a lot of HP
                await bot.agitate()
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { agitateLoop() }, Math.max(bot.getCooldown("agitate"), 10))
    }
    agitateLoop()

    async function buyLoop() {
        try {
            if (!game.active) return

            if (Tools.hasItem("computer", game.character.items)) {
                // Buy HP Pots
                const numHpot1 = Tools.countItem("hpot1", game.character.items)
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = Tools.countItem("mpot1", game.character.items)
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 60000)
    }
    buyLoop()

    async function hardshellLoop() {
        try {
            if (!game.active) return

            let numTargeting = 0
            for (const entity of game.entities.values()) {
                if (entity.target == game.character.id) {
                    numTargeting++
                    continue
                }
            }

            // Use hardshell if we are low on HP and entities are attacking us
            if (numTargeting > 0 && game.character.hp / game.character.max_hp < 0.25) await bot.hardshell()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { hardshellLoop() }, Math.max(bot.getCooldown("hardshell"), 10))
    }
    hardshellLoop()

    async function healLoop() {
        try {
            if (!game.active) return

            const missingHP = game.character.max_hp - game.character.hp
            const missingMP = game.character.max_mp - game.character.mp
            const hpRatio = game.character.hp / game.character.max_hp
            const mpRatio = game.character.mp / game.character.max_mp
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
            if (!game.active) return

            for (const id of game.chests.keys()) {
                game.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function sendItemLoop() {
        try {
            if (!game.active) return

            if (game.players.has("earthMer")) {
                const merchant = game.players.get("earthMer")
                const distance = Tools.distance(game.character, merchant)
                if (distance < 400) {
                    for (let i = 4; i < game.character.items.length; i++) {
                        const item = game.character.items[i]
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
            if (!game.active) return

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

    console.info(`Starting mage (${game.character.id})!`)
    const bot = new MageBot(game)

    game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        game.disconnect()
    })

    async function attackLoop() {
        try {
            if (!game.active) return

            const targets: string[] = []
            for (const [id, entity] of game.entities) {
                if (entity.type != "scorpion") continue // Only attack scorpions
                if (entity.target != "earthWar") continue // Only attack those attacking our warrior
                if (entity.s.burned) continue // Don't attack monsters that are burning
                if (Tools.distance(game.character, entity) > game.character.range) continue // Only attack those in range

                // Don't attack if there's a projectile going towards it
                let isTargetedbyProjectile = false
                for (const projectile of game.projectiles.values()) {
                    if (projectile.target == id) {
                        isTargetedbyProjectile = true
                        break
                    }
                }
                if (isTargetedbyProjectile) continue

                targets.push(id)
            }

            if (targets.length > 0 && game.character.mp >= game.character.mp_cost) {
                await bot.attack(targets[0])
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(bot.getCooldown("attack"), 10))
    }
    attackLoop()

    async function buyLoop() {
        try {
            if (!game.active) return

            if (Tools.hasItem("computer", game.character.items)) {
                // Buy HP Pots
                const numHpot1 = Tools.countItem("hpot1", game.character.items)
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = Tools.countItem("mpot1", game.character.items)
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 60000)
    }
    buyLoop()

    async function energizeLoop() {
        try {
            if (!game.active) return

            let friend: PlayerData
            if (game.character.id == "earthMag") {
                friend = game.players.get("earthMag2")
            } else if (game.character.id == "earthMag2") {
                friend = game.players.get("earthMag")
            }

            if (friend) await bot.energize(friend.id)
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { energizeLoop() }, Math.max(bot.getCooldown("energize"), 10))
    }
    energizeLoop()

    async function healLoop() {
        try {
            if (!game.active) return

            const missingHP = game.character.max_hp - game.character.hp
            const missingMP = game.character.max_mp - game.character.mp
            const hpRatio = game.character.hp / game.character.max_hp
            const mpRatio = game.character.mp / game.character.max_mp
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
            if (!game.active) return

            for (const id of game.chests.keys()) {
                game.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function partyLoop() {
        try {
            if (!game.active) return

            if (!game.party) {
                bot.sendPartyRequest("earthWar")
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 10000)
    }
    partyLoop()

    async function sendItemLoop() {
        try {
            if (!game.active) return

            if (game.players.has("earthMer")) {
                const merchant = game.players.get("earthMer")
                const distance = Tools.distance(game.character, merchant)
                if (distance < 400) {
                    for (let i = 3; i < game.character.items.length; i++) {
                        const item = game.character.items[i]
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

async function startPriest(auth: string, character: string, user: string, server: ServerRegion, identifier: ServerIdentifier) {
    const game = new Game(server, identifier)
    await game.connect(auth, character, user)

    console.info(`Starting priest (${game.character.id})!`)
    const bot = new PriestBot(game)

    game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        game.disconnect()
    })

    async function attackLoop() {
        try {
            if (!game.active) return

            const targets: string[] = []
            for (const [id, entity] of game.entities) {
                if (entity.type != "scorpion") continue // Only attack scorpions
                if (entity.target != "earthWar") continue // Only attack those attacking our warrior
                if (entity.s.burned) continue // Don't attack monsters that are burning
                if (Tools.distance(game.character, entity) > game.character.range) continue // Only attack those in range

                // Don't attack if there's a projectile going towards it
                let isTargetedbyProjectile = false
                for (const projectile of game.projectiles.values()) {
                    if (projectile.target == id) {
                        isTargetedbyProjectile = true
                        break
                    }
                }
                if (isTargetedbyProjectile) continue

                targets.push(id)
            }

            const friend = game.players.get("earthWar")
            if (friend && friend.hp / friend.max_hp < 0.5) {
                // Heal our tank
                await bot.heal(friend.id)
            } else if (game.character.hp / game.character.max_hp < 1) {
                // Heal ourselves
                await bot.heal(game.character.id)
            } else if (targets.length > 0 && game.character.mp >= game.character.mp_cost) {
                // Attack monsters
                await bot.attack(targets[0])
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(bot.getCooldown("attack"), 10))
    }
    attackLoop()

    async function buyLoop() {
        try {
            if (!game.active) return

            if (Tools.hasItem("computer", game.character.items)) {
                // Buy HP Pots
                const numHpot1 = Tools.countItem("hpot1", game.character.items)
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = Tools.countItem("mpot1", game.character.items)
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 60000)
    }
    buyLoop()

    async function healLoop() {
        try {
            if (!game.active) return

            const missingHP = game.character.max_hp - game.character.hp
            const missingMP = game.character.max_mp - game.character.mp
            const hpRatio = game.character.hp / game.character.max_hp
            const mpRatio = game.character.mp / game.character.max_mp
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
            if (!game.active) return

            for (const id of game.chests.keys()) {
                game.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function partyLoop() {
        try {
            if (!game.active) return
            
            if (!game.party) {
                bot.sendPartyRequest("earthWar")
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 10000)
    }
    partyLoop()

    async function sendItemLoop() {
        try {
            if (!game.active) return

            if (game.players.has("earthMer")) {
                const merchant = game.players.get("earthMer")
                const distance = Tools.distance(game.character, merchant)
                if (distance < 400) {
                    for (let i = 3; i < game.character.items.length; i++) {
                        const item = game.character.items[i]
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