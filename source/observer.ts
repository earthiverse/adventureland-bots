import { Game2 } from "./game2.js"

async function start() {
    await Game2.login("email@email.email", "password")

    await Game2.startObserver("ASIA", "I")
    await Game2.startObserver("US", "I")
    await Game2.startObserver("US", "II")
    await Game2.startObserver("US", "III")
    await Game2.startObserver("EU", "I")
    await Game2.startObserver("EU", "II")
}

start()