import { Tools } from "./tools.js"
import { Game, Mage, Priest, Warrior } from "./game.js"

const AGGRO_CHAR = "earthMag"
const mages: Mage[] = []

/**
 * Used to aggro monsters. Equip the weapon you want firehazard on on this character.
 */
async function startWarrior(bot: Warrior): Promise<Warrior> {
    console.info(`Starting warrior (${bot.character.id})!`)

    bot.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.disconnect()
    })

    bot.socket.on("request", (data: { name: string }) => {
        bot.acceptPartyRequest(data.name)
    })

    async function agitateLoop() {
        try {
            if (bot.socket.disconnected) return

            let numTargeting = 0
            let closeTargets = 0
            for (const entity of bot.entities.values()) {
                if (entity.target == bot.character.id) {
                    numTargeting++
                    continue
                }
                if (Tools.distance(bot.character, entity) <= bot.G.skills.agitate.range
                    && !entity.target
                    && entity.type == "scorpion") {
                    closeTargets++
                }
            }

            if (closeTargets > 1 && numTargeting + closeTargets < 3) {
                // Taunt no more than 3 enemies
                await bot.agitate()
            } else if (closeTargets > 1 && bot.character.hp / bot.character.max_hp > 0.75) {
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
            if (bot.socket.disconnected) return

            if (Tools.hasItem("computer", bot.character.items)) {
                // Buy HP Pots
                const numHpot1 = Tools.countItem("hpot1", bot.character.items)
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = Tools.countItem("mpot1", bot.character.items)
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
            if (bot.socket.disconnected) return

            let numTargeting = 0
            for (const entity of bot.entities.values()) {
                if (entity.target == bot.character.id) {
                    numTargeting++
                    continue
                }
            }

            // Use hardshell if we are low on HP and entities are attacking us
            if (numTargeting > 0 && bot.character.hp / bot.character.max_hp < 0.25) await bot.hardshell()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { hardshellLoop() }, Math.max(bot.getCooldown("hardshell"), 10))
    }
    hardshellLoop()

    async function healLoop() {
        try {
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
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
            if (bot.socket.disconnected) return

            for (const id of bot.chests.keys()) {
                bot.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.players.has("earthMer")) {
                const merchant = bot.players.get("earthMer")
                const distance = Tools.distance(bot.character, merchant)
                if (distance < 400) {
                    for (let i = 0; i < bot.character.items.length; i++) {
                        const item = bot.character.items[i]
                        if (!item
                            || item.name == "computer"
                            || item.name == "tracker"
                            || item.name == "hpot0"
                            || item.name == "hpot1"
                            || item.name == "mpot0"
                            || item.name == "mpot1") continue // Don't send important items

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
            if (bot.socket.disconnected) return

            let numTargeting = 0
            const closeTargets: string[] = []
            for (const entity of bot.entities.values()) {
                if (entity.target == bot.character.id) {
                    numTargeting++
                    continue
                }
                if (Tools.distance(bot.character, entity) <= bot.G.skills.taunt.range
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
async function startMage(bot: Mage) {
    console.info(`Starting mage (${bot.character.id})!`)

    bot.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.disconnect()
    })

    bot.socket.on("request", (data: { name: string }) => {
        bot.acceptPartyRequest(data.name)
    })

    async function buyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (Tools.hasItem("computer", bot.character.items)) {
                // Buy HP Pots
                const numHpot1 = Tools.countItem("hpot1", bot.character.items)
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = Tools.countItem("mpot1", bot.character.items)
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
            if (bot.socket.disconnected) return

            const targets: [string, number][] = []
            for (const [id, entity] of bot.entities) {
                if (entity.type != "scorpion") continue // Only attack scorpions
                if (entity.target) continue // Don't attack them if they are already targeting a player
                if (entity.s.burned) continue // Don't attack monsters that are burning
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                // Don't attack if there's a projectile going towards it
                let isTargetedbyProjectile = false
                for (const projectile of bot.projectiles.values()) {
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
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
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
            if (bot.socket.disconnected) return

            for (const id of bot.chests.keys()) {
                bot.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.players.has("earthMer")) {
                const merchant = bot.players.get("earthMer")
                const distance = Tools.distance(bot.character, merchant)
                if (distance < 400) {
                    for (let i = 0; i < bot.character.items.length; i++) {
                        const item = bot.character.items[i]
                        if (!item
                            || item.name == "computer"
                            || item.name == "tracker"
                            || item.name == "hpot0"
                            || item.name == "hpot1"
                            || item.name == "mpot0"
                            || item.name == "mpot1") continue // Don't send important items

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
async function startPriest(bot: Priest): Promise<void> {
    console.info(`Starting priest (${bot.character.id})!`)

    bot.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.disconnect()
    })

    async function attackLoop() {
        try {
            if (bot.socket.disconnected) return

            const targets: string[] = []
            for (const [id, entity] of bot.entities) {
                if (entity.type != "scorpion") continue // Only attack scorpions
                if (entity.target != AGGRO_CHAR) continue // Only attack those attacking our warrior
                if (entity.s.burned) continue // Don't attack monsters that are burning
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                // Don't attack if there's a projectile going towards it
                let isTargetedbyProjectile = false
                for (const projectile of bot.projectiles.values()) {
                    if (projectile.target == id) {
                        isTargetedbyProjectile = true
                        break
                    }
                }
                if (isTargetedbyProjectile) continue

                targets.push(id)
            }

            const friend = bot.players.get(AGGRO_CHAR)
            if (friend && friend.hp / friend.max_hp < 0.5) {
                // Heal our tank
                await bot.heal(friend.id)
            } else if (bot.character.hp / bot.character.max_hp < 1) {
                // Heal ourselves
                await bot.heal(bot.character.id)
            } else if (targets.length > 0 && bot.character.mp >= bot.character.mp_cost) {
                // Attack monsters
                // TODO: Improve, so if we have multiple mages we loop through them and check if any are ready to energize
                if (mages.length > 0 && mages[0].getCooldown("energize") == 0) {
                    await mages[0].energize(bot.character.id)
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
            if (bot.socket.disconnected) return

            if (Tools.hasItem("computer", bot.character.items)) {
                // Buy HP Pots
                const numHpot1 = Tools.countItem("hpot1", bot.character.items)
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = Tools.countItem("mpot1", bot.character.items)
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
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
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
            if (bot.socket.disconnected) return

            for (const id of bot.chests.keys()) {
                bot.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function partyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!bot.party) {
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
            if (bot.socket.disconnected) return

            if (bot.players.has("earthMer")) {
                const merchant = bot.players.get("earthMer")
                const distance = Tools.distance(bot.character, merchant)
                if (distance < 400) {
                    for (let i = 0; i < bot.character.items.length; i++) {
                        const item = bot.character.items[i]
                        if (!item
                            || item.name == "computer"
                            || item.name == "tracker"
                            || item.name == "hpot0"
                            || item.name == "hpot1"
                            || item.name == "mpot0"
                            || item.name == "mpot1") continue // Don't send important items

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
    await Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpasswordlol")

    const earthMag = await Game.startMage("earthMag", "US", "I")
    const earthPri = await Game.startPriest("earthPri", "US", "I")
    const earthPri2 = await Game.startPriest("earthPri2", "US", "I")

    // Used to attack the monsters. Put fire weapons on these characters.
    startPriest(earthPri) //earthPri
    startPriest(earthPri2) //earthPri2

    // Used to taunt & agitate. Put the weapon you want to upgrade on this character.
    startMage(earthMag)
    mages.push(earthMag) //earthMag
}

run()