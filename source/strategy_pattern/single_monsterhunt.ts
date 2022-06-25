import AL from "alclient"
import { Strategist } from "./context.js"
import { BaseAttackStrategy } from "./strategies/attack.js"
import { BaseStrategy } from "./strategies/base.js"
import { FinishMonsterHuntStrategy, GetMonsterHuntStrategy } from "./strategies/monsterhunt.js"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()
    const ranger = await AL.Game.startRanger("earthiverse", "US", "III")
    const rangerContext = new Strategist(ranger, baseStrategy)

    const strategy = new BaseAttackStrategy({ characters: [], typeList: ["goo"] })
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
        if (["bat", "bee", "crab", "goo", "poisio", "tortoise"].includes(ranger.s.monsterhunt.id)) {
            rangerContext.applyStrategy(new BaseAttackStrategy({ characters: [], typeList: [ranger.s.monsterhunt.id] }))
            return
        }

        // Do Base Strategy
        rangerContext.applyStrategy(new BaseAttackStrategy({ characters: [], typeList: ["goo"] }))
    }, 1000)
}
run()