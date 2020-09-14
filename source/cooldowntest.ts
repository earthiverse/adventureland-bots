import { Game } from "./game.js"
import { Tools } from "./tools.js"
import { EvalData, GameResponseData } from "./definitions/adventureland-server.js"
import { SkillName } from "./definitions/adventureland.js"

async function startRanger() {
    const ranger = await Game.startRanger("earthiverse", "US", "II")
    console.info(`Starting ranger (${ranger.character.id})!`)

    ranger.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        ranger.disconnect()
    })

    return ranger
}

async function startMage() {
    const mage = await Game.startMage("earthMag", "US", "II")
    console.info(`Starting mage (${mage.character.id})!`)

    mage.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        mage.disconnect()
    })

    return mage
}

async function run() {
    await Game.login("hyprkookeez@gmail.com", "notmyrealpasswordlol")

    const ranger = await startRanger() //earthiverse
    const mage = await startMage() //earthMag

    async function testLoop() {
        try {
            const getTarget = () => {
                for (const [id, entity] of ranger.entities) {
                    if (entity.type != "goo") continue // Only attack goos
                    if (Tools.distance(ranger.character, entity) > ranger.character.range + ranger.character.xrange) continue // Only attack those in range

                    // Don't attack if there's a projectile going towards it
                    let isTargetedbyProjectile = false
                    for (const projectile of ranger.projectiles.values()) {
                        if (projectile.target == id) {
                            isTargetedbyProjectile = true
                            break
                        }
                    }
                    if (isTargetedbyProjectile) continue

                    return id
                }
            }

            // 1. Ranger Attack (Success)
            let evalTime: number
            let evalMS: number
            const evalCooldown = (data: EvalData) => {
                const skillReg1 = /skill_timeout\s*\(\s*['"](.+?)['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.exec(data.code)
                if (skillReg1) {
                    const skill = skillReg1[1] as SkillName
                    if (skill == "attack" && skillReg1[2]) {
                        console.log(data)
                        evalMS = Number.parseFloat(skillReg1[2])
                        evalTime = Date.now()
                    }
                }
                ranger.socket.removeListener("eval", evalCooldown)
            }
            ranger.socket.on("eval", evalCooldown)
            await ranger.attack(getTarget())

            // 2. Energize Ranger
            await mage.energize(ranger.character.id)

            // 3. Ranger Attack (Fail)
            let gameResponseTime: number
            let gameResponseMS: number
            const gameResponseCooldown = (data: GameResponseData) => {
                if (typeof data == "string") return
                if (data.response == "cooldown") {
                    gameResponseTime = Date.now()
                    gameResponseMS = data.ms
                    console.log(data)
                    ranger.socket.removeListener("game_response", gameResponseCooldown)
                }
            }
            ranger.socket.on("game_response", gameResponseCooldown)
            try {
                await ranger.attack(getTarget())
            } catch(e) {
                // Ignore this error
            }

            console.log("-------------------------")
            const elapsedTime = gameResponseTime - evalTime
            console.log(`Time Between Attack Attempts: ${elapsedTime}ms`)
            console.log(`Initial Cooldown: ${evalMS}ms`)
            console.log(`After Energize Cooldown: ${gameResponseMS}ms`)
            console.log(`Discrepancy: ${elapsedTime - (evalMS - gameResponseMS)}`)
            console.log("-------------------------")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { testLoop() }, 10000)
    }
    testLoop()

    async function healLoop() {
        try {
            const missingHP = mage.character.max_hp - mage.character.hp
            const missingMP = mage.character.max_mp - mage.character.mp
            const hpRatio = mage.character.hp / mage.character.max_hp
            const mpRatio = mage.character.mp / mage.character.max_mp
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && mage.hasItem("hpot1")) {
                    await mage.useHPPot(await mage.locateItem("hpot1"))
                } else {
                    await mage.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && mage.hasItem("mpot1")) {
                    await mage.useMPPot(await mage.locateItem("mpot1"))
                } else {
                    await mage.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && mage.hasItem("hpot1")) {
                    await mage.useHPPot(await mage.locateItem("hpot1"))
                } else {
                    await mage.regenHP()
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(mage.getCooldown("use_hp"), 10))
    }
    healLoop()
}

run()