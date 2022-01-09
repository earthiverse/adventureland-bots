import AL from "alclient"
import { SingleChar } from "./single/context.js"
import { BasicAttackAndMoveStrategy } from "./single/strategies/attack.js"
import { BaseStrategy } from "./single/strategies/base.js"
import { FinishMonsterHuntStrategy, GetMonsterHuntStrategy } from "./single/strategies/monsterhunt.js"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()
    const ranger = await AL.Game.startRanger("earthiverse", "US", "III")
    const rangerContext = new SingleChar(ranger, baseStrategy)

    const strategy = new BasicAttackAndMoveStrategy(["goo"])
    rangerContext.applyStrategy(strategy)

    setInterval(async () => {
        // Get Monster Hunt
        if (!ranger.s.monsterhunt) {
            rangerContext.applyStrategy(new GetMonsterHuntStrategy())
            return
        }

        // Finish Monster Hunt
        if (ranger.s.monsterhunt && ranger.s.monsterhunt.c == 0) {
            rangerContext.applyStrategy(new FinishMonsterHuntStrategy())
            return
        }

        // Do Monster Hunt
        if (["bat", "crab", "goo"].includes(ranger.s.monsterhunt.id)) {
            rangerContext.applyStrategy(new BasicAttackAndMoveStrategy([ranger.s.monsterhunt.id]))
            return
        }

        // Do Base Strategy
        rangerContext.applyStrategy(new BasicAttackAndMoveStrategy(["goo"]))
    }, 1000)
}
run()