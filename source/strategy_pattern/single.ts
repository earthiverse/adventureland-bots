import AL from "alclient"
import { SingleCharacter } from "./single/context"
import { Single_BasicAttackAndMoveStrategy } from "./single/strategy"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const ranger = new SingleCharacter(await AL.Game.startRanger("earthiverse", "ASIA", "I"))
    const strategy = new Single_BasicAttackAndMoveStrategy(["goo"])
    ranger.setStrategy(strategy)

    setInterval(async () => {
        // do strategy changes here
    }, 1000)
}
run()