import { Game } from "./game.js"

async function start() {
    await Game.startObserver("ASIA", "I")
    await Game.startObserver("US", "I")
    await Game.startObserver("US", "II")
    await Game.startObserver("US", "III")
    await Game.startObserver("EU", "I")
    await Game.startObserver("EU", "II")
}

start()