import { Game2 } from "./Game2"

async function start() {
    await Promise.all([Game2.loginJSONFile("../credentials.json"), Game2.getGData()])

    await Promise.all([Game2.startObserver("ASIA", "I"),
    Game2.startObserver("US", "I"),
    Game2.startObserver("US", "II"),
    Game2.startObserver("US", "III"),
    Game2.startObserver("US", "PVP"),
    Game2.startObserver("EU", "I"),
    Game2.startObserver("EU", "II"),
    Game2.startObserver("EU", "PVP")])
}

start()