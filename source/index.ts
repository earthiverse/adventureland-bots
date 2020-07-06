import dotenv from "dotenv"
import { Game } from "./game.js"
import { Bot } from "./bot.js"

dotenv.config({ path: "../.env" })
console.log([process.env.AUTH, process.env.CHARACTER, process.env.USER])

let game = new Game("US", "I")
console.log("Connecting...")
game.connect(process.env.AUTH, process.env.CHARACTER, process.env.USER).then(() => {
    console.info("Starting bot!")

    let bot = new Bot(game)

    async function attackLoop() {
        // Cooldown check
        if (bot.getCooldown("attack")) {
            console.info(`Attack is on cooldown ${bot.getCooldown("attack")}`)
            setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
            return
        }

        // Attack
        try {
            let nearest = bot.getNearestMonster("goo")
            await bot.attack(nearest.id)
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
    }
    attackLoop()

    async function healLoop() {
        if (bot.getCooldown("use_hp")) {
            console.info(`Heal is on cooldown ${bot.getCooldown("use_hp")}`)
            setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))
            return
        }

        let hpRatio = game.character.hp / game.character.max_hp
        let mpRatio = game.character.mp / game.character.max_mp
        if (hpRatio < mpRatio) {
            try {
                await bot.regenHP()
            } catch (e) {
                console.error(e)
            }
            setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))
            return
        } else if (mpRatio < hpRatio) {
            try {
                await bot.regenMP()
            } catch (e) {
                console.error(e)
            }
            setTimeout(async () => { healLoop() }, bot.getCooldown("use_mp"))
            return
        } else if (hpRatio < 1) {
            try {
                await bot.regenHP()
            } catch (e) {
                console.error(e)
            }
            setTimeout(async () => { healLoop() }, bot.getCooldown("use_hp"))
            return
        }
    }
    healLoop()
})