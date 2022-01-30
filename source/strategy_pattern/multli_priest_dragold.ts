import AL, { MonsterName } from "alclient"
import { Strategist } from "./context.js"
import { BasicAttackAndMoveStrategy } from "./strategies/attack.js"
import { BaseStrategy } from "./strategies/base.js"
import { FinishMonsterHuntStrategy, GetMonsterHuntStrategy } from "./strategies/monsterhunt.js"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()
    const priest1 = await AL.Game.startPriest("attackPri", "US", "III")
    const priest1Context = new Strategist(priest1, baseStrategy)
    const priest2 = await AL.Game.startPriest("attackPri2", "US", "III")
    const priest2Context = new Strategist(priest2, baseStrategy)
    const priest3 = await AL.Game.startPriest("attackPri3", "US", "III")
    const priest3Context = new Strategist(priest3, baseStrategy)
    priest3Context.stop()

    for (const context of [priest1Context, priest2Context, priest3Context]) {
        setInterval(async () => {
            // Do Base Strategy
            context.applyStrategy(new BasicAttackAndMoveStrategy(["goo"]))
        }, 1000)
    }
}
run()