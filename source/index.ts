import dotenv from "dotenv"
import { Game } from "./game.js"
import { Bot } from "./bot.js"

dotenv.config({ path: "../.env" })
console.log([process.env.AUTH, process.env.CHARACTER, process.env.USER])

let game = new Game("ASIA", "I")
console.log("Connecting...")
game.connect(process.env.AUTH, process.env.CHARACTER, process.env.USER)

let bot = new Bot(game)

