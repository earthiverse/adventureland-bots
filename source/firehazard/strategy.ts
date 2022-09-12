import AL, { ItemName, LocateItemFilters, Merchant, MonsterName, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, startMerchant } from "../merchant/strategy.js"
import { Loop, LoopName, Strategist, Strategy } from "../strategy_pattern/context.js"
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

const MERCHANT = "earthMer"
const FARMER = "earthWar"
const SUPPORTER_1 = "earthWar2"
const SUPPORTER_2 = "earthPri"
const MONSTERS: MonsterName[] = ["plantoid"]

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
let FIREHAZARD_FARMER_CONTEXT: Strategist<PingCompensatedCharacter>
const FIREHAZARD_SUPPORT_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()

    const merchant = await AL.Game.startMerchant(MERCHANT, "US", "I")
    const merchantContext = new Strategist<Merchant>(merchant, baseStrategy)
    startMerchant(merchantContext, CONTEXTS, { ...DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, debug: true })
    CONTEXTS.push(merchantContext)

    const warrior1 = await AL.Game.startWarrior(FARMER, "US", "I")
    const context1 = new Strategist<Warrior>(warrior1, baseStrategy)
    startFirehazardFarmer(context1, "fireblade", { level: 0 }).catch(console.error)
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

const baseStrategy = new BaseStrategy(CONTEXTS)
const buyStrategy = new BuyStrategy({
    buyMap: undefined,
    replenishables: new Map<ItemName, number>([
        ["hpot1", 2500],
        ["mpot1", 2500]
    ])
})
const debugStrategy = new DebugStrategy({
    logAchievementProgress: true
})
const partyAcceptStrategy = new AcceptPartyRequestStrategy({ allowList: [SUPPORTER_1, SUPPORTER_2] })
const partyRequestStrategy = new RequestPartyStrategy(FARMER)
const trackerStrategy = new TrackerStrategy()

class FirehazardEquipStrategy implements Strategy<PingCompensatedCharacter> {
    public loops = new Map<LoopName, Loop<PingCompensatedCharacter>>()

    public item: ItemName
    public filters: LocateItemFilters

    public constructor(item: ItemName, filters?: LocateItemFilters) {
        this.item = item
        this.filters = filters

        this.loops.set("equip", {
            fn: async (bot: PingCompensatedCharacter) => { await this.equipBest(bot) },
            interval: 250
        })
    }

    public equipBest(bot: PingCompensatedCharacter) {
        const monsters = bot.getEntities({
            hpLessThan: 10_000,
            targetingMe: true,
            willBurnToDeath: true
        })

        const shouldEquipItem = monsters.length > 0
        if (shouldEquipItem) {
            const locate = bot.locateItem(this.item, bot.items, this.filters)
            if (locate === undefined) return // Assume we have it equipped
            return bot.equip(locate, "mainhand")
        } else {
            // Equip the best fire weapon we have
            let item: ItemName
            switch (bot.ctype) {
                case "mage":
                case "priest":
                    item = "firestaff"
                    break
                case "ranger":
                    item = "firebow"
                    break
                case "warrior":
                    item = "fireblade"
                    break
            }
            const locate = bot.locateItem(item, bot.items, { returnHighestLevel: true })
            if (locate === undefined) return // Assume we have it
            const itemInfo = bot.items[locate]
            if (bot.slots.mainhand && bot.slots.mainhand.name == item && bot.slots.mainhand.level > itemInfo.level) return // We already have a higher level one equipped
            return bot.equip(locate, "mainhand")
        }
    }
}

async function startFirehazardFarmer(context: Strategist<PingCompensatedCharacter>, item: ItemName, itemFilters: LocateItemFilters) {
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
    const equipStrategy = new FirehazardEquipStrategy(item, itemFilters)
    const moveToMonsterStrategy = new ImprovedMoveStrategy(MONSTERS)

    context.applyStrategy(equipStrategy)
    context.applyStrategy(baseStrategy)
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

    context.applyStrategy(baseStrategy)
    context.applyStrategy(attackStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(debugStrategy)
    context.applyStrategy(moveToBotStrategy)
    context.applyStrategy(partyRequestStrategy)
    context.applyStrategy(trackerStrategy)
}