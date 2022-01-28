import AL, { MonsterName } from "alclient"
import { SingleChar } from "./single/context.js"
import { BasicAttackAndMoveStrategy } from "./single/strategies/attack.js"
import { BaseStrategy } from "./single/strategies/base.js"
import { FinishMonsterHuntStrategy, GetMonsterHuntStrategy } from "./single/strategies/monsterhunt.js"

const doableMonsters: MonsterName[] = ["bat", "bee", "crab", "goo"]
const defaultMonster: MonsterName = "goo"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()
    const mage1 = await AL.Game.startMage("earthMag", "US", "III")
    const mage1Context = new SingleChar(mage1, baseStrategy)
    const mage2 = await AL.Game.startMage("earthMag2", "US", "III")
    const mage2Context = new SingleChar(mage2, baseStrategy)
    const mage3 = await AL.Game.startMage("earthMag3", "US", "III")
    const mage3Context = new SingleChar(mage3, baseStrategy)

    for (const context of [mage1Context, mage2Context, mage3Context]) {
        setInterval(async () => {
        // Get Monster Hunt
            if (!context.bot.s.monsterhunt) {
                context.applyStrategy(new GetMonsterHuntStrategy())
                return
            }

            // Finish Monster Hunt
            if (context.bot.s.monsterhunt && context.bot.s.monsterhunt.c == 0) {
                context.applyStrategy(new FinishMonsterHuntStrategy())
                return
            }

            // Do Monster Hunt
            if (doableMonsters.includes(context.bot.s.monsterhunt.id)) {
                context.applyStrategy(new BasicAttackAndMoveStrategy([context.bot.s.monsterhunt.id]))
                return
            }

            // Do Base Strategy
            context.applyStrategy(new BasicAttackAndMoveStrategy(["goo"]))
        }, 1000)
    }
}
run()