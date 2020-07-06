import dotenv from "dotenv"
import { Game } from "./game.js"
import { Bot } from "./bot.js"

dotenv.config({ path: "../.env" })
console.log([process.env.AUTH, process.env.CHARACTER, process.env.USER])

let game = new Game("ASIA", "I")
console.log("Connecting...")
game.connect(process.env.AUTH, process.env.CHARACTER, process.env.USER)

let bot = new Bot(game)

async function attackLoop() {
    // Cooldown check
    if (bot.getCooldown("attack")) setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))

    // Attack
    let nearest = bot.getNearestMonster("goo")
    await bot.attack(nearest.id)

    setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
}
attackLoop()

async function healLoop() {
    if (bot.getCooldown("use_hp")) setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))

    let hpRatio = game.character.hp / game.character.max_hp
    let mpRatio = game.character.mp / game.character.max_mp
    if (hpRatio < mpRatio) {
        await bot.regenHP()
        setTimeout(async () => { attackLoop() }, bot.getCooldown("use_hp"))
        return
    } else if (mpRatio < hpRatio) {
        await bot.regenMP()
        setTimeout(async () => { attackLoop() }, bot.getCooldown("use_mp"))
        return
    } else if (hpRatio < 1) {
        await bot.regenHP()
        setTimeout(async () => { attackLoop() }, bot.getCooldown("use_hp"))
        return
    }
}
healLoop()