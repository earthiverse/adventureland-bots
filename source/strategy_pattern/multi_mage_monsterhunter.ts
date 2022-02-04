import AL, { IPosition, Mage, Merchant, MonsterName, ServerIdentifier, ServerRegion } from "alclient"
import { Strategist, Strategy } from "./context.js"
import { BasicAttackStrategy } from "./strategies/attack.js"
import { BaseStrategy } from "./strategies/base.js"
import { FinishMonsterHuntStrategy, GetMonsterHuntStrategy } from "./strategies/monsterhunt.js"
import { BasicMoveStrategy, HoldPositionMoveStrategy } from "./strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategies/party.js"
import { OpenStandWhenMovingStrategy } from "./strategies/stand.js"

/**
 * This script will farm monsterhunt tokens using 3 mages. Mages are nice because they can
 * move around the world very quickly using blink, making them good for monsterhunts.
 *
 * NOTES:
 *   Partying:
 *     - mage1 is the party leader
 *   Strategy:
 *     - defaultMonster will use BasicMoveStrategy and BasicAttackStrategy
 */

/***** Config Start *****/
const server: ServerRegion = "US"
const serverID: ServerIdentifier = "III"
const credentialsPath = "../../credentials.json"
const additionalPartyMembers: string[] = []
const defaultMonster: MonsterName = "poisio"
const defaultStrategyMonsters: MonsterName[] = ["bee", "crab", "goo", "osnake", "scorpion", "snake", "squig", "squigtoad"]
const merchantHoldPosition: IPosition = { map: "main", x: 0, y: 0 }
const merchantID = "earthMer"
const mage1ID = "earthMag"
const mage2ID = "earthMag2"
const mage3ID = "earthMag3"
/***** Config End *****/

// Monster Hunt Strategies
const getMonsterHuntStrategy = new GetMonsterHuntStrategy()
const finishMonsterHuntStrategy = new FinishMonsterHuntStrategy()

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile(credentialsPath), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()
    const merchant = await AL.Game.startMerchant(merchantID, server, serverID)
    const merchantContext = new Strategist<Merchant>(merchant, baseStrategy)
    const mage1 = await AL.Game.startMage(mage1ID, server, serverID)
    const mage1Context = new Strategist<Mage>(mage1, baseStrategy)
    const mage2 = await AL.Game.startMage(mage2ID, server, serverID)
    const mage2Context = new Strategist<Mage>(mage2, baseStrategy)
    const mage3 = await AL.Game.startMage(mage3ID, server, serverID)
    const mage3Context = new Strategist<Mage>(mage3, baseStrategy)

    // Set-up Strategies
    const strategies: {[T in MonsterName]?: Strategy<Mage>[]} = {}

    // Default Monster
    strategies[defaultMonster] = [
        new BasicMoveStrategy<Mage>(defaultMonster),
        new BasicAttackStrategy<Mage>(defaultMonster)
    ]

    // Default Strategy Monsters
    for (const monster of defaultStrategyMonsters) {
        if (strategies[monster]) {
            console.warn(`We already set up a strategy for ${monster}.`)
            continue
        }
        strategies[defaultMonster] = [
            new BasicMoveStrategy(defaultMonster),
            new BasicAttackStrategy(defaultMonster)
        ]
    }

    // Party Strategy
    const requestPartyStrategy = new RequestPartyStrategy(mage1.id)
    const acceptPartyRequestStrategy = new AcceptPartyRequestStrategy([mage2.id, mage3.id, ...additionalPartyMembers])

    // Merchant
    const merchantMoveStrategy = new HoldPositionMoveStrategy(merchantHoldPosition)
    const merchantStandStrategy = new OpenStandWhenMovingStrategy()

    // Mages
    setInterval(async () => {
        mage1Context.applyStrategy(acceptPartyRequestStrategy)
        mage2Context.applyStrategy(requestPartyStrategy)
        mage3Context.applyStrategy(requestPartyStrategy)

        for (const context of [mage1Context, mage2Context, mage3Context]) {
            const mage = context.bot
            try {
                // Get Monster Hunt
                if (!mage.s.monsterhunt) {
                    context.applyStrategy(getMonsterHuntStrategy)
                    return
                }

                // Finish Monster Hunt
                if (mage.s.monsterhunt && mage.s.monsterhunt.c == 0) {
                    context.applyStrategy(finishMonsterHuntStrategy)
                    return
                }

                const monsterhuntMonster = mage.s.monsterhunt.id
                if (defaultStrategyMonsters.includes(monsterhuntMonster)) {
                    // Attack using the basic strategy
                    context.applyStrategies(strategies[monsterhuntMonster])
                } else {
                    // Do Base Strategy
                    context.applyStrategies(strategies[defaultMonster])
                }
            } catch (e) {
                console.error(e)
            }
        }
    }, 1000)

    setInterval(async () => {
        try {
            // const merchant = merchantContext.bot

            // Toggle stand if we're moving
            merchantContext.applyStrategy(merchantStandStrategy)

            // Hold position in town
            merchantContext.applyStrategy(merchantMoveStrategy)
        } catch (e) {
            console.error(e)
        }
    }, 1000)
}
run()