import AL from "alclient-mongo"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Pathfinder.prepare()])

    // Start all characters
    console.log("Connecting...")
    const ranger = await AL.Game.startRanger("earthRan2", "ASIA", "I")
    ranger.socket.on("disconnect", async (data) => {
        console.log("We were disconnected.")
        console.log(data)
    })

    async function healLoop() {
        if (ranger.socket.disconnected) {
            // Wait until we reconnect
            setTimeout(async () => { healLoop() }, 100)
            return
        }

        try {
            if (!ranger.rip) {
                const missingHP = ranger.max_hp - ranger.hp
                const missingMP = ranger.max_mp - ranger.mp
                const hpRatio = ranger.hp / ranger.max_hp
                const mpRatio = ranger.mp / ranger.max_mp
                const hpot1 = ranger.locateItem("hpot1")
                const hpot0 = ranger.locateItem("hpot0")
                const mpot1 = ranger.locateItem("mpot1")
                const mpot0 = ranger.locateItem("mpot0")
                if (hpRatio < mpRatio) {
                    if (missingHP >= 400 && hpot1 !== undefined) {
                        await ranger.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await ranger.useHPPot(hpot0)
                    } else {
                        await ranger.regenHP()
                    }
                } else if (mpRatio < hpRatio) {
                    if (missingMP >= 500 && mpot1 !== undefined) {
                        await ranger.useMPPot(mpot1)
                    } else if (missingMP >= 300 && mpot0 !== undefined) {
                        await ranger.useMPPot(mpot0)
                    } else {
                        await ranger.regenMP()
                    }
                } else if (hpRatio < 1) {
                    if (missingHP >= 400 && hpot1 !== undefined) {
                        await ranger.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await ranger.useHPPot(hpot0)
                    } else {
                        await ranger.regenHP()
                    }
                }
            }

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(ranger.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function moveLoop() {
        if (ranger.socket.disconnected) {
            // Wait until we reconnect
            setTimeout(async () => { moveLoop() }, 100)
            return
        }

        try {
            const nearest = ranger.getNearestMonster("goo")
            if (!nearest) {
                // Move to goos
                await ranger.smartMove("goo")
                moveLoop()
                return
            } else if (nearest.distance > ranger.range) {
                // Move to the nearest monster
                ranger.smartMove(nearest.monster).catch(() => { /* Empty to catch errors */ })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    async function attackLoop() {
        if (ranger.socket.disconnected) {
            // Wait until we reconnect
            setTimeout(async () => { attackLoop() }, 100)
            return
        }

        try {
            if (ranger.canUse("attack")) {
                const nearest = ranger.getNearestMonster("goo")
                if (nearest?.distance <= ranger.range) {
                    // Attack!
                    await ranger.basicAttack(nearest.monster.id)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(ranger.getCooldown("attack"), 10))
    }
    attackLoop()

    async function connectLoop() {
        if (ranger.socket.disconnected) {
            console.log("We are disconnected. Reconnecting!")
            ranger.socket.connect()
            setTimeout(async () => { connectLoop() }, 60000)
            return
        }

        setTimeout(async () => { connectLoop() }, 1000)
    }
    connectLoop()

    async function disconnectLoop() {
        if (ranger.socket.disconnected) {
            // Wait until we reconnect
            console.log("Uh... we're still disconnected?")
            setTimeout(async () => { disconnectLoop() }, 60000)
            return
        }

        console.log("Attempting to disconnect (spamming move)")
        for (let i = 0; i < 100; i++) {
            ranger.move(ranger.x + 1, ranger.y - 1).catch(() => { /* Empty to catch errors */ })
        }

        setTimeout(async () => { disconnectLoop() }, 60000)
    }
    setTimeout(async () => { disconnectLoop() }, 60000)
}
run()