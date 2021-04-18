import AL from "alclient"

/** Config */
const merchantName = "earthMer"
const rangerName = "earthiverse"
const priestName = "earthPri"
const rogueName = "earthRog"
const region: AL.ServerRegion = "ASIA"
const identifier: AL.ServerIdentifier = "I"

let merchant: AL.Merchant
let ranger: AL.Ranger
let priest: AL.Priest
let rogue: AL.Rogue

const RADIUS = 125
const MOVE_TIME_MS = 500

async function startShared(bot: AL.Character) {
    async function healLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { moveLoop() }, 10)
                return
            }

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
                    if (bot.c.town) {
                        await bot.regenHP()
                    } else if (missingHP >= 400 && hpot1 !== undefined) {
                        await bot.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await bot.useHPPot(hpot0)
                    } else {
                        await bot.regenHP()
                    }
                } else if (mpRatio < hpRatio) {
                    if (bot.c.town) {
                        await bot.regenHP()
                    } else if (missingMP >= 500 && mpot1 !== undefined) {
                        await bot.useMPPot(mpot1)
                    } else if (missingMP >= 300 && mpot0 !== undefined) {
                        await bot.useMPPot(mpot0)
                    } else {
                        await bot.regenMP()
                    }
                } else if (hpRatio < 1) {
                    if (bot.c.town) {
                        await bot.regenHP()
                    } else if (missingHP >= 400 && hpot1 !== undefined) {
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

        setTimeout(async () => { healLoop() }, Math.max(10, bot.getCooldown("use_hp")))
    }
    healLoop()

    async function lootLoop() {
        try {
            if (bot.socket.disconnected) return

            for (const [, chest] of bot.chests) {
                if (AL.Tools.distance(bot, chest) > 800) continue
                await bot.openChest(chest.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 250)
    }
    lootLoop()

    let moveLoop: { (): void; (): Promise<void>; (): Promise<void> }
    const bscorpionSpawn = bot.locateMonster("bscorpion")[0]
    if (bot.ctype == "rogue") {
        moveLoop = async () => {
            try {
                if (bot.socket.disconnected) {
                    setTimeout(async () => { moveLoop() }, 10)
                    return
                }

                // If we are dead, respawn
                if (bot.rip) {
                    await bot.respawn()
                    setTimeout(async () => { moveLoop() }, 1000)
                    return
                }

                if (AL.Pathfinder.canWalkPath(bot, bscorpionSpawn)) {
                    const bscorpion = bot.getNearestMonster("bscorpion")?.monster
                    if (bscorpion?.target) {
                        // There's a bscorpion and it has a target
                        bot.move(bscorpion.x, bscorpion.y).catch(() => { /* Ignore errors */ })
                    } else if (bscorpion) {
                        // There's no bscorpion, or it has no target

                        const angleFromSpawnToBscorpionGoing = Math.atan2(bscorpion.going_y - bscorpionSpawn.y, bscorpion.going_x - bscorpionSpawn.x)
                        const endGoalAngle = angleFromSpawnToBscorpionGoing + Math.PI // Our goal is 180 degrees opposite
                        const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(endGoalAngle), y: bscorpionSpawn.y + RADIUS * Math.sin(endGoalAngle) }

                        const moveDistance = bot.speed * MOVE_TIME_MS / 1000
                        const angleFromSpawnToRanger = Math.atan2(bot.y - bscorpionSpawn.y, bot.x - bscorpionSpawn.x)
                        const moveAngle = 2 * Math.asin(moveDistance * 0.5 / RADIUS)
                        const moveGoal1 = { x: bscorpionSpawn.x + RADIUS * Math.cos(angleFromSpawnToRanger + moveAngle), y: bscorpionSpawn.y + RADIUS * Math.sin(angleFromSpawnToRanger + moveAngle) }
                        const moveGoal2 = { x: bscorpionSpawn.x + RADIUS * Math.cos(angleFromSpawnToRanger - moveAngle), y: bscorpionSpawn.y + RADIUS * Math.sin(angleFromSpawnToRanger - moveAngle) }
                        const moveGoal1Distance = AL.Tools.distance(moveGoal1, endGoal)
                        const moveGoal2Distance = AL.Tools.distance(moveGoal2, endGoal)
                        if (moveGoal1Distance > moveGoal2Distance) {
                            bot.move(moveGoal2.x, moveGoal2.y).catch(() => { /* Ignore Errors */ })
                        } else {
                            bot.move(moveGoal1.x, moveGoal1.y).catch(() => { /* Ignore Errors */ })
                        }
                    } else {
                        // There isn't a bscorpion nearby
                        const angleFromSpawnToBot = Math.atan2(rogue.y - bscorpionSpawn.y, rogue.x - bscorpionSpawn.x)
                        const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(angleFromSpawnToBot), y: bscorpionSpawn.y + RADIUS * Math.sin(angleFromSpawnToBot) }
                        bot.move(endGoal.x, endGoal.y)
                    }
                } else {
                    // Move to the bscorpion spawn
                    await bot.smartMove(bscorpionSpawn, { getWithin: RADIUS })
                }
            } catch (e) {
                console.error(e)
            }

            setTimeout(async () => { moveLoop() }, MOVE_TIME_MS)
        }
        moveLoop()
    } else if (bot.ctype !== "merchant") {
        moveLoop = async () => {
            try {
                if (bot.socket.disconnected) {
                    setTimeout(async () => { moveLoop() }, 10)
                    return
                }

                // If we are dead, respawn
                if (bot.rip) {
                    await bot.respawn()
                    setTimeout(async () => { moveLoop() }, 1000)
                    return
                }

                if (AL.Pathfinder.canWalkPath(bot, bscorpionSpawn)) {
                    const bscorpion = bot.getNearestMonster("bscorpion")?.monster
                    if (bscorpion) {
                        // There's a bscorpion nearby
                        const angleFromSpawnToBscorpionGoing = Math.atan2(bscorpion.going_y - bscorpionSpawn.y, bscorpion.going_x - bscorpionSpawn.x)
                        const endGoalAngle = angleFromSpawnToBscorpionGoing + Math.PI // Our goal is 180 degrees opposite
                        const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(endGoalAngle), y: bscorpionSpawn.y + RADIUS * Math.sin(endGoalAngle) }

                        const moveDistance = bot.speed * MOVE_TIME_MS / 1000
                        const angleFromSpawnToRanger = Math.atan2(bot.y - bscorpionSpawn.y, bot.x - bscorpionSpawn.x)
                        const moveAngle = 2 * Math.asin(moveDistance * 0.5 / RADIUS)
                        const moveGoal1 = { x: bscorpionSpawn.x + RADIUS * Math.cos(angleFromSpawnToRanger + moveAngle), y: bscorpionSpawn.y + RADIUS * Math.sin(angleFromSpawnToRanger + moveAngle) }
                        const moveGoal2 = { x: bscorpionSpawn.x + RADIUS * Math.cos(angleFromSpawnToRanger - moveAngle), y: bscorpionSpawn.y + RADIUS * Math.sin(angleFromSpawnToRanger - moveAngle) }
                        const moveGoal1Distance = AL.Tools.distance(moveGoal1, endGoal)
                        const moveGoal2Distance = AL.Tools.distance(moveGoal2, endGoal)
                        if (moveGoal1Distance > moveGoal2Distance) {
                            bot.move(moveGoal2.x, moveGoal2.y).catch(() => { /* Ignore Errors */ })
                        } else {
                            bot.move(moveGoal1.x, moveGoal1.y).catch(() => { /* Ignore Errors */ })
                        }
                    } else {
                        // There isn't a bscorpion nearby
                        const angleFromSpawnToBot = Math.atan2(rogue.y - bscorpionSpawn.y, rogue.x - bscorpionSpawn.x)
                        const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(angleFromSpawnToBot), y: bscorpionSpawn.y + RADIUS * Math.sin(angleFromSpawnToBot) }
                        bot.move(endGoal.x, endGoal.y)
                    }
                } else {
                    // Move to the bscorpion spawn
                    await bot.smartMove(bscorpionSpawn, { getWithin: RADIUS })
                }
            } catch (e) {
                console.error(e)
            }

            setTimeout(async () => { moveLoop() }, MOVE_TIME_MS)
        }
        moveLoop()
    }
}

async function startRanger(ranger: AL.Ranger) {
    async function attackLoop() {
        try {
            if (ranger.socket.disconnected) {
                setTimeout(async () => { attackLoop() }, 10)
                return
            }

            const nearby = ranger.getNearestMonster("bscorpion")?.monster
            if (nearby
                && [rogue.id, ranger.id, priest.id].includes(nearby.target)
                && AL.Tools.distance(ranger, nearby) <= ranger.range) {
                if (ranger.canUse("huntersmark")) await ranger.huntersMark(nearby.id)
                if (ranger.canUse("piercingshot")) await ranger.piercingShot(nearby.id)
                else if (ranger.canUse("attack")) await ranger.basicAttack(nearby.id)
                if (ranger.canUse("supershot")) await ranger.superShot(nearby.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, ranger.getCooldown("attack")))
    }
    attackLoop()
}

async function startPriest(priest: AL.Priest) {
    async function attackLoop() {
        try {
            if (priest.socket.disconnected) {
                setTimeout(async () => { attackLoop() }, 10)
                return
            }

            if (priest.canUse("heal")) {
                if (priest.hp < priest.max_hp * 0.8) {
                    // Heal ourself
                    await priest.heal(priest.id)
                } else {
                    // Heal others
                    for (const [, player] of priest.players) {
                        if (player.hp > player.max_hp * 0.8) continue // Lots of HP
                        if (AL.Tools.distance(priest, player) > priest.range) continue // Too far away

                        await priest.heal(player.id)
                        break
                    }
                }
            }

            const nearby = priest.getNearestMonster("bscorpion")?.monster
            if (nearby
                && (!nearby.target || [rogue.id, ranger.id, priest.id].includes(nearby.target))
                && AL.Tools.distance(priest, nearby) <= priest.range) {
                if (priest.canUse("curse")) await priest.curse(nearby.id)
                if (priest.canUse("darkblessing")) await priest.darkBlessing()
                if (priest.canUse("attack")) await priest.basicAttack(nearby.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, priest.getCooldown("attack")))
    }
    attackLoop()

    // TODO: if the scorpion is aggro on a friend, take the aggro from them
}

async function startRogue(rogue: AL.Rogue) {
    async function attackLoop() {
        try {
            if (rogue.socket.disconnected) {
                setTimeout(async () => { attackLoop() }, 10)
                return
            }

            const nearby = rogue.getNearestMonster("bscorpion")?.monster
            if (nearby
                && [rogue.id, ranger.id, priest.id].includes(nearby.target)
                && AL.Tools.distance(rogue, nearby) <= rogue.range) {
                if (rogue.canUse("attack")) await rogue.basicAttack(nearby.id)
                if (rogue.canUse("quickstab")) await rogue.quickStab(nearby.id)
                if (rogue.canUse("quickpunch")) await rogue.quickPunch(nearby.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, rogue.getCooldown("attack")))
    }
    attackLoop()

    async function rspeedLoop() {
        try {
            if (rogue.socket.disconnected) {
                setTimeout(async () => { rspeedLoop() }, 10)
                return
            }


            if (rogue.canUse("rspeed")) {

                if (!rogue.s.rspeed || rogue.s.rspeed.ms <= 60000) {
                    // Apply it to ourselves
                    await rogue.rspeed(rogue.id)
                } else {
                    // Apply it to others
                    for (const [, player] of rogue.players) {
                        if (!player.s.rspeed || player.s.rspeed.ms > 60000) continue // Already has rspeed
                        if (AL.Tools.distance(rogue, player) > rogue.G.skills.rspeed.range) continue // Too far away

                        await rogue.rspeed(player.id)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { rspeedLoop() }, Math.max(10, rogue.getCooldown("rspeed")))
    }
    rspeedLoop()
}

async function startMerchant(merchant: AL.Merchant) {
    async function healLoop() {
        try {
            if (merchant.socket.disconnected) {
                setTimeout(async () => { healLoop() }, 10)
                return
            }

            if (!merchant.rip) {
                const missingHP = merchant.max_hp - merchant.hp
                const missingMP = merchant.max_mp - merchant.mp
                const hpRatio = merchant.hp / merchant.max_hp
                const mpRatio = merchant.mp / merchant.max_mp
                const hpot1 = merchant.locateItem("hpot1")
                const hpot0 = merchant.locateItem("hpot0")
                const mpot1 = merchant.locateItem("mpot1")
                const mpot0 = merchant.locateItem("mpot0")
                if (hpRatio < mpRatio) {
                    if (merchant.c.town) {
                        await merchant.regenHP()
                    } else if (missingHP >= 400 && hpot1 !== undefined) {
                        await merchant.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await merchant.useHPPot(hpot0)
                    } else {
                        await merchant.regenHP()
                    }
                } else if (mpRatio < hpRatio) {
                    if (merchant.c.town) {
                        await merchant.regenHP()
                    } else if (missingMP >= 500 && mpot1 !== undefined) {
                        await merchant.useMPPot(mpot1)
                    } else if (missingMP >= 300 && mpot0 !== undefined) {
                        await merchant.useMPPot(mpot0)
                    } else {
                        await merchant.regenMP()
                    }
                } else if (hpRatio < 1) {
                    if (merchant.c.town) {
                        await merchant.regenHP()
                    } else if (missingHP >= 400 && hpot1 !== undefined) {
                        await merchant.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await merchant.useHPPot(hpot0)
                    } else {
                        await merchant.regenHP()
                    }
                }
            }

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(merchant.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function moveLoop() {
        try {
            await merchant.smartMove("main")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, MOVE_TIME_MS)
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Pathfinder.prepare()])

    // Start all characters
    console.log("Connecting...")
    const merchantP = AL.Game.startMerchant(merchantName, region, identifier)
    const rangerP = AL.Game.startRanger(rangerName, region, identifier)
    const priestP = AL.Game.startPriest(priestName, region, identifier)
    const rogueP = AL.Game.startRogue(rogueName, region, identifier)
    merchant = await merchantP
    ranger = await rangerP
    priest = await priestP
    rogue = await rogueP

    // Set up functionality to reconnect if we disconnect
    // TODO: Add a delay
    const reconnect = async (character: AL.PingCompensatedCharacter) => {
        console.log(`Reconnecting ${character.id}...`)
        await character.disconnect()
        await character.connect()
        character.socket.on("disconnect", async () => { await reconnect(character) })
    }
    merchant.socket.on("disconnect", async () => { await reconnect(merchant) })
    ranger.socket.on("disconnect", async () => { await reconnect(ranger) })
    priest.socket.on("disconnect", async () => { await reconnect(priest) })
    rogue.socket.on("disconnect", async () => { await reconnect(rogue) })

    // Start the characters
    startShared(merchant)
    startMerchant(merchant)
    startShared(ranger)
    startRanger(ranger)
    startShared(priest)
    startPriest(priest)
    startShared(rogue)
    startRogue(rogue)
}
run()