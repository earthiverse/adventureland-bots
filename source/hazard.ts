import { PingCompensatedGame as Game } from "./game.js"
import { WarriorBot, MageBot, PriestBot } from "./bot.js"
import { Tools } from "./tools.js"
import { ServerRegion, ServerIdentifier } from "./definitions/adventureland.js"
import { Game2, Player } from "./game2.js"

const AGGRO_CHAR = "earthMag"
const mages: MageBot[] = []

/**
 * Used to aggro monsters. Equip the weapon you want firehazard on on this character.
 */
async function startWarrior(auth: string, character: string, user: string, server: ServerRegion, identifier: ServerIdentifier): Promise<WarriorBot> {
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

    return bot
}

/**
 * Used to aggro monsters. Equip the weapon you want firehazard on on this character.
 */
async function startMage(game: Player): Promise<MageBot> {
    console.info(`Starting mage (${game.character.id})!`)
    const bot = new MageBot(game)

    game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        game.disconnect()
    })

    game.socket.on("request", (data: { name: string }) => {
        bot.acceptPartyRequest(data.name)
    })

    async function buyLoop() {
        try {
            if (game.socket.disconnected) return

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

    async function cburstLoop() {
        try {
            if (game.socket.disconnected) return

            const targets: [string, number][] = []
            for (const [id, entity] of game.entities) {
                if (entity.type != "scorpion") continue // Only attack scorpions
                if (entity.target) continue // Don't attack them if they are already targeting a player
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

                // Attack each target for 1 damage
                targets.push([id, 2])
            }

            if (targets.length > 0) {
                await bot.cburst(targets)
            }

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { cburstLoop() }, Math.max(bot.getCooldown("cburst"), 10))
    }
    cburstLoop()

    async function healLoop() {
        try {
            if (game.socket.disconnected) return

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
            if (game.socket.disconnected) return

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
            if (game.socket.disconnected) return

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

    return bot
}

/**
 * Used to attack monsters. Equip this character with a fire staff.
 */
async function startPriest(game: Player): Promise<PriestBot> {
    console.info(`Starting priest (${game.character.id})!`)
    const bot = new PriestBot(game)

    game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        game.disconnect()
    })

    async function attackLoop() {
        try {
            if (game.socket.disconnected) return

            const targets: string[] = []
            for (const [id, entity] of game.entities) {
                if (entity.type != "scorpion") continue // Only attack scorpions
                if (entity.target != AGGRO_CHAR) continue // Only attack those attacking our warrior
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

            const friend = game.players.get(AGGRO_CHAR)
            if (friend && friend.hp / friend.max_hp < 0.5) {
                // Heal our tank
                await bot.heal(friend.id)
            } else if (game.character.hp / game.character.max_hp < 1) {
                // Heal ourselves
                await bot.heal(game.character.id)
            } else if (targets.length > 0 && game.character.mp >= game.character.mp_cost) {
                // Attack monsters
                if (mages.length > 0 && mages[0].getCooldown("energize") == 0) {
                    await mages[0].energize(game.character.id)
                }
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
            if (game.socket.disconnected) return

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
            if (game.socket.disconnected) return

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
            if (game.socket.disconnected) return

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
            if (game.socket.disconnected) return

            if (!game.party) {
                bot.sendPartyRequest(AGGRO_CHAR)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 10000)
    }
    partyLoop()

    async function sendItemLoop() {
        try {
            if (game.socket.disconnected) return

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

    return bot
}

async function run() {
    await Game2.login("hyprkookeez@gmail.com", "notmyrealpasswordlol")

    const earthMag = Game2.startCharacter("earthMag", "US", "I")
    const earthPri = Game2.startCharacter("earthPri", "US", "I")
    const earthPri2 = Game2.startCharacter("earthPri2", "US", "I")
    
    // Used to attack the monsters. Put fire weapons on these characters.
    startPriest(await earthPri) //earthPri
    startPriest(await earthPri2) //earthPri2

    // Used to taunt & agitate. Put the weapon you want to upgrade on this character.
    mages.push(await startMage(await earthMag)) //earthMag
}

run()