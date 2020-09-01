import { PingCompensatedGame as Game } from "./game.js"
import { RangerBot, MageBot } from "./bot.js"
import { Tools } from "./tools.js"
import { EvalData, GameResponseData } from "./definitions/adventureland-server.js"
import { SkillName } from "./definitions/adventureland.js"

async function startRanger(auth: string, character: string, user: string) {
    const game = new Game("US", "II")
    await game.connect(auth, character, user)

    console.info(`Starting ranger (${character})!`)
    const bot = new RangerBot(game)

    bot.game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.game.disconnect()
    })

    return bot
}

async function startMage(auth: string, character: string, user: string) {
    const game = new Game("US", "II")
    await game.connect(auth, character, user)

    console.info(`Starting mage (${character})!`)
    const bot = new MageBot(game)

    bot.game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.game.disconnect()
    })

    return bot
}

async function run() {
    const ranger = await startRanger("secret", "secret", "secret") //earthiverse
    const mage = await startMage("secret", "secret", "secret") //earthMag

    async function testLoop() {
        try {
            const getTarget = () => {
                for (const [id, entity] of ranger.game.entities) {
                    if (entity.type != "goo") continue // Only attack goos
                    if (Tools.distance(ranger.game.character, entity) > ranger.game.character.range + ranger.game.character.xrange) continue // Only attack those in range

                    // Don't attack if there's a projectile going towards it
                    let isTargetedbyProjectile = false
                    for (const projectile of ranger.game.projectiles.values()) {
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
                ranger.game.socket.removeListener("eval", evalCooldown)
            }
            ranger.game.socket.on("eval", evalCooldown)
            await ranger.attack(getTarget())

            // 2. Energize Ranger
            await mage.energize(ranger.game.character.id)

            // 3. Ranger Attack (Fail)
            let gameResponseTime: number
            let gameResponseMS: number
            const gameResponseCooldown = (data: GameResponseData) => {
                if (typeof data == "string") return
                if (data.response == "cooldown") {
                    gameResponseTime = Date.now()
                    gameResponseMS = data.ms
                    console.log(data)
                    ranger.game.socket.removeListener("game_response", gameResponseCooldown)
                }
            }
            ranger.game.socket.on("game_response", gameResponseCooldown)
            await ranger.attack(getTarget())

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
}

run()