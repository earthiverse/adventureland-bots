import dotenv from "dotenv"
import { Game } from "./game.js"
import { Bot } from "./bot.js"
import { ChestData } from "./definitions/adventureland-server.js"

dotenv.config({ path: "../earthRan2.env" })
console.log([process.env.AUTH, process.env.CHARACTER, process.env.USER])

let game = new Game("US", "I")
console.log("Connecting...")
game.connect(process.env.AUTH, process.env.CHARACTER, process.env.USER).then(async () => {
    console.info("Starting bot!")
    let bot = new Bot(game)

    game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        game.disconnect()
    })

    // Open chests as soon as they are dropped
    game.socket.on("drop", (data: ChestData) => {
        game.socket.emit("open_chest", { id: data.id })
    })

    async function attackLoop() {
        if (!game.active) return
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
        if (!game.active) return
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