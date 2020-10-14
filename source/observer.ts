import { Game } from "./game.js"

async function start() {
    await Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpasswordlol")

    await Game.startObserver("ASIA", "I")
    await Game.startObserver("US", "I")
    await Game.startObserver("US", "II")
    await Game.startObserver("US", "III")
    await Game.startObserver("US", "PVP")
    await Game.startObserver("EU", "I")
    await Game.startObserver("EU", "II")
    await Game.startObserver("EU", "PVP")
}

start()