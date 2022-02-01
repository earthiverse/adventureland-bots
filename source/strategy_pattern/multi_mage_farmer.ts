import AL, { MonsterName, PingCompensatedCharacter, ServerIdentifier, ServerRegion } from "alclient"
import { Strategist, Strategy } from "./context.js"
import { BasicAttackAndMoveStrategy } from "./strategies/attack.js"
import { BaseStrategy } from "./strategies/base.js"
import { FinishMonsterHuntStrategy, GetMonsterHuntStrategy } from "./strategies/monsterhunt.js"

const farmMonster: MonsterName = "poisio"
const server: ServerRegion = "US"
const serverID: ServerIdentifier = "III"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()
    const merchant = await AL.Game.startMerchant("earthMer", server, serverID)
    const merchantContext = new Strategist(merchant, baseStrategy)
    const mage1 = await AL.Game.startMage("earthMag", server, serverID)
    const mage1Context = new Strategist(mage1, baseStrategy)
    const mage2 = await AL.Game.startMage("earthMag2", server, serverID)
    const mage2Context = new Strategist(mage2, baseStrategy)
    const mage3 = await AL.Game.startMage("earthMag3", server, serverID)
    const mage3Context = new Strategist(mage3, baseStrategy)

    // Mages
    setInterval(async () => {
        for (const context of [mage1Context, mage2Context, mage3Context]) {
            try {
            // Do Base Strategy
                context.applyStrategy(new BasicAttackAndMoveStrategy([farmMonster]))
            } catch (e) {
                console.error(e)
            }
        }
    }, 1000)

    // Merchant
    setInterval(async () => {
        // TODO: Merchant logic
    }, 1000)
}
run()