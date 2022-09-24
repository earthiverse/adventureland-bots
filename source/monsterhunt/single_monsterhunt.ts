import AL from "alclient"
import { Strategist } from "../strategy_pattern/context.js"
import { BaseAttackStrategy } from "../strategy_pattern/strategies/attack.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { FinishMonsterHuntStrategy, GetMonsterHuntStrategy } from "../strategy_pattern/strategies/move.js"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()
    const ranger = await AL.Game.startRanger("earthiverse", "US", "III")
    const rangerContext = new Strategist(ranger, baseStrategy)

    const baseAttackStrategy = new BaseAttackStrategy({ contexts: [], typeList: ["goo"] })
    rangerContext.applyStrategy(baseAttackStrategy)

    const getMonsterHuntStrategy = new GetMonsterHuntStrategy()
    const finishMonsterHuntStrategy = new FinishMonsterHuntStrategy()

    // Movement
    setInterval(async () => {
        // Get Monster Hunt
        if (!ranger.s.monsterhunt) {
            rangerContext.applyStrategy(getMonsterHuntStrategy)
            return
        }

        // Finish Monster Hunt
        if (ranger.s.monsterhunt && ranger.s.monsterhunt.c == 0) {
            rangerContext.applyStrategy(finishMonsterHuntStrategy)
            return
        }
    }, 1000)

    // Attack
    setInterval(async () => {
        // Do Monster Hunt
        if (["bat", "bee", "crab", "goo", "poisio", "tortoise"].includes(ranger.s.monsterhunt.id)) {
            rangerContext.applyStrategy(new BaseAttackStrategy({ contexts: [], typeList: [ranger.s.monsterhunt.id] }))
            return
        }

        // Do Base Strategy
        rangerContext.applyStrategy(new BaseAttackStrategy({ contexts: [], typeList: ["goo"] }))
    }, 1000)
}
run().catch(console.error)