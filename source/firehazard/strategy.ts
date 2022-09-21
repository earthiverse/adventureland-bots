import AL, { ItemName, Merchant, MonsterName, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, startMerchant } from "../merchant/strategy.js"
import { Strategist } from "../strategy_pattern/context.js"
import { FirehazardEquipStrategy } from "../strategy_pattern/strategies/equip.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "../strategy_pattern/strategies/attack.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategy_pattern/strategies/attack_warrior.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { DebugStrategy } from "../strategy_pattern/strategies/debug.js"
import { FollowFriendMoveStrategy, ImprovedMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"

/**
 * Farm firehazard on a weapon
 * Equip the weapon you want to add firehazard to on the bot that will run `startFirehazardFarmer`
 * Equip weapons that will cause burn on the bots that will run `startFirehazardSupporter`
 */

// Login and prepare pathfinding
await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

// Config
const MERCHANT = "earthMer"
const FARMER = "earthWar"
const SUPPORTER_1 = "earthWar2"
const SUPPORTER_2 = "earthPri"
const MONSTERS: MonsterName[] = ["plantoid"]
const equipStrategy = new FirehazardEquipStrategy("fireblade", { level: 0 })

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
let FIREHAZARD_FARMER_CONTEXT: Strategist<PingCompensatedCharacter>
const FIREHAZARD_SUPPORT_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const baseStrategy = new BaseStrategy(CONTEXTS)
const buyStrategy = new BuyStrategy({
    buyMap: undefined,
    replenishables: new Map<ItemName, number>([
        ["hpot1", 2500],
        ["mpot1", 2500],
        ["xptome", 1],
    ])
})
const debugStrategy = new DebugStrategy({
    logAchievementProgress: true
})
const partyAcceptStrategy = new AcceptPartyRequestStrategy({ allowList: [SUPPORTER_1, SUPPORTER_2] })
const partyRequestStrategy = new RequestPartyStrategy(FARMER)
const trackerStrategy = new TrackerStrategy()
const moveToMonsterStrategy = new ImprovedMoveStrategy(MONSTERS)

async function run() {

    const merchant = await AL.Game.startMerchant(MERCHANT, "US", "I")
    const merchantContext = new Strategist<Merchant>(merchant, baseStrategy)
    startMerchant(merchantContext, CONTEXTS, { ...DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, debug: true, enableUpgrade: true })
    CONTEXTS.push(merchantContext)

    const warrior1 = await AL.Game.startWarrior(FARMER, "US", "I")
    const context1 = new Strategist<Warrior>(warrior1, baseStrategy)
    startFirehazardFarmer(context1).catch(console.error)
    FIREHAZARD_FARMER_CONTEXT = context1
    CONTEXTS.push(context1)

    const warrior2 = await AL.Game.startWarrior(SUPPORTER_1, "US", "I")
    const context2 = new Strategist<Warrior>(warrior2, baseStrategy)
    startFirehazardSupporter(context2).catch(console.error)
    FIREHAZARD_SUPPORT_CONTEXTS.push(context2)
    CONTEXTS.push(context2)

    const priest = await AL.Game.startPriest(SUPPORTER_2, "US", "I")
    const context3 = new Strategist<Priest>(priest, baseStrategy)
    startFirehazardSupporter(context3).catch(console.error)
    FIREHAZARD_SUPPORT_CONTEXTS.push(context3)
    CONTEXTS.push(context3)
}
run().catch(console.error)

async function startFirehazardFarmer(context: Strategist<PingCompensatedCharacter>) {
    const attackStrategyOptions: BaseAttackStrategyOptions = {
        contexts: [],
        couldGiveCredit: true,
        disableZapper: true,
        hpGreaterThan: 10_000,
        maximumTargets: 2,
        typeList: MONSTERS,
        willBurnToDeath: false,
        willDieToProjectiles: false,
    }
    let attackStrategy: BaseAttackStrategy<PingCompensatedCharacter>
    switch (context.bot.ctype) {
        case "priest":
            attackStrategy = new PriestAttackStrategy(attackStrategyOptions)
            break
        case "ranger":
            attackStrategy = new RangerAttackStrategy(attackStrategyOptions)
            break
        case "warrior":
            attackStrategy = new WarriorAttackStrategy(attackStrategyOptions)
            break
        default:
            attackStrategy = new BaseAttackStrategy(attackStrategyOptions)
            break

    }

    context.applyStrategy(equipStrategy)
    context.applyStrategy(attackStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(debugStrategy)
    context.applyStrategy(moveToMonsterStrategy)
    context.applyStrategy(partyAcceptStrategy)
    context.applyStrategy(trackerStrategy)
}

async function startFirehazardSupporter(context: Strategist<PingCompensatedCharacter>) {
    const moveToBotStrategy = new FollowFriendMoveStrategy(FIREHAZARD_FARMER_CONTEXT)

    const attackStrategyOptions: BaseAttackStrategyOptions = {
        contexts: CONTEXTS,
        disableZapper: true,
        targetingPlayer: FARMER,
        willBurnToDeath: false,
        willDieToProjectiles: false
    }
    let attackStrategy: BaseAttackStrategy<PingCompensatedCharacter>
    switch (context.bot.ctype) {
        case "priest":
            attackStrategy = new PriestAttackStrategy(attackStrategyOptions)
            break
        case "ranger":
            attackStrategy = new RangerAttackStrategy(attackStrategyOptions)
            break
        case "warrior":
            attackStrategy = new WarriorAttackStrategy(attackStrategyOptions)
            break
        default:
            attackStrategy = new BaseAttackStrategy(attackStrategyOptions)
            break
    }

    context.applyStrategy(attackStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(debugStrategy)
    context.applyStrategy(moveToBotStrategy)
    context.applyStrategy(partyRequestStrategy)
    context.applyStrategy(trackerStrategy)
}