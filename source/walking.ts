import { Game, PingCompensatedPlayer } from "./game.js"
import { Pathfinder } from "./pathfinder.js"

async function healLoop(bot: PingCompensatedPlayer) {
    try {
        if (bot.socket.disconnected) return

        const missingHP = bot.character.max_hp - bot.character.hp
        const missingMP = bot.character.max_mp - bot.character.mp
        const hpRatio = bot.character.hp / bot.character.max_hp
        const mpRatio = bot.character.mp / bot.character.max_mp
        const hpot1 = bot.locateItem("hpot1")
        const mpot1 = bot.locateItem("mpot1")
        if (hpRatio < mpRatio) {
            if (missingHP >= 400 && hpot1) {
                await bot.useHPPot(hpot1)
            } else {
                await bot.regenHP()
            }
        } else if (mpRatio < hpRatio) {
            if (missingMP >= 500 && mpot1) {
                await bot.useMPPot(mpot1)
            } else {
                await bot.regenMP()
            }
        } else if (hpRatio < 1) {
            if (missingHP >= 400 && hpot1) {
                await bot.useHPPot(hpot1)
            } else {
                await bot.regenHP()
            }
        }
    } catch (e) {
        //console.error(e)
    }

    setTimeout(async () => { healLoop(bot) }, Math.max(bot.getCooldown("use_hp"), 10))
}

async function run() {
    await Promise.all([Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpasswordlol"), Pathfinder.prepare()])

    const bot = await Game.startCharacter("earthMer", "ASIA", "I")
    healLoop(bot)

    for (let i = 0; i < 100; i++) {
        await bot.smartMove({ map: "main", x: -74, y: 1904 })
        await bot.smartMove("main")
        await bot.smartMove({ map: "main", x: 1600, y: -500 })
    }

    console.log(bot.character)

    Game.disconnect()
}

run()