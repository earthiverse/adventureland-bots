import AL from "alclient"
import { startHealLoop, startLootLoop } from "../archive/base/general.js"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials2.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    /** 1: Login */
    const bot = await AL.Game.startRanger("attacking", "US", "II")

    /** 2: Move to goos */
    await bot.smartMove("goo")

    /** 3: Setup Basics */
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            const nearest = bot.getEntity({ returnNearest: true, type: "goo" })
            if (AL.Tools.distance(bot, nearest) > bot.range) await bot.move(bot.x + (nearest.x - bot.x) / 2, bot.y + (nearest.y - bot.y) / 2)

        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
    }
    moveLoop()
    startHealLoop(bot)
    startLootLoop(bot)

    /** 3: Test attacking */
    let nextAttack: Date
    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            const nearest = bot.getEntity({ returnNearest: true, type: "goo" })
            if (nearest) {
                await bot.basicAttack(nearest.id)
                nextAttack = bot.nextSkill.get("attack")
            }
        } catch (e) {
            console.error(e)
            if (nextAttack) {
                const cooldownOriginal = nextAttack.getTime() - Date.now()

                const match: RegExpMatchArray = e.match(/ms: (\d+)/)
                if (match) {
                    console.log(`Match: '${match[1]}'`)
                    const cooldownNow = Number.parseInt(match[1]) - Math.min(...bot.pings)
                    const cooldownDifference = cooldownNow - cooldownOriginal

                    console.log(`Original: ${cooldownOriginal}, Now: ${cooldownNow}, Difference: ${cooldownDifference}`)
                }
            }
        }
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, 100 - Math.min(...bot.pings)))
    }
    attackLoop()
}
run()