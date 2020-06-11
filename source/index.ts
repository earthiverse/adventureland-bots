import dotenv from "dotenv"
import { Game } from "./game.js"

dotenv.config({ path: "../.env" })
console.log([process.env.AUTH, process.env.CHARACTER, process.env.USER])

let game = new Game("ASIA", "I")
game.connect(process.env.AUTH, process.env.CHARACTER, process.env.USER)

setTimeout(() => {
    console.log("Closing socket...")
    game.disconnect()
}, 10000);