import { Game } from "./Game.js"

async function start() {
    await Promise.all([Game.loginJSONFile("../credentials.json"), Game.getGData()])
    
    await Promise.all([Game.startObserver("ASIA", "I"),
        Game.startObserver("US", "I"),
        Game.startObserver("US", "II"),
        Game.startObserver("US", "III"),
        Game.startObserver("US", "PVP"),
        Game.startObserver("EU", "I"),
        Game.startObserver("EU", "II"),
        Game.startObserver("EU", "PVP")])
}

start()