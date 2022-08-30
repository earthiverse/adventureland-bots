import AL, { ItemName, LocateItemFilters, PingCompensatedCharacter } from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseAttackStrategy } from "../strategy_pattern/strategies/attack.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { DebugStrategy } from "../strategy_pattern/strategies/debug.js"
import { BasicMoveStrategy, FollowFriendMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"

/**
 * Attack plantoids (Sprawlings) on desertland to farm firehazard on a weapon
 * Equip the weapon you want to add firehazard to on the bot that will run `startFirehazardFarmer`
 * Equip weapons that will cause burn on the bots that will run `startFirehazardSupporter`
 */

const FARMER = "earthWar"
const SUPPORTER_1 = "earthWar2"
const SUPPORTER_2 = "earthPri"

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
let FIREHAZARD_FARMER_CONTEXT: Strategist<PingCompensatedCharacter>
const FIREHAZARD_SUPPORT_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()

    const warrior1 = await AL.Game.startWarrior(FARMER, "US", "I")
    const context1 = new Strategist<PingCompensatedCharacter>(warrior1, baseStrategy)
    startFirehazardFarmer(context1, "fireblade", { level: 0 }).catch(console.error)
    FIREHAZARD_FARMER_CONTEXT = context1
    CONTEXTS.push(context1)

    const warrior2 = await AL.Game.startWarrior(SUPPORTER_1, "US", "I")
    const context2 = new Strategist<PingCompensatedCharacter>(warrior2, baseStrategy)
    startFirehazardSupporter(context2).catch(console.error)
    FIREHAZARD_SUPPORT_CONTEXTS.push(context2)
    CONTEXTS.push(context2)

    const priest = await AL.Game.startPriest(SUPPORTER_2, "US", "I")
    const context3 = new Strategist<PingCompensatedCharacter>(priest, baseStrategy)
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
    logAchievementProgress: true,
    logLimitDCReport: true
})
const moveToMonsterStrategy = new BasicMoveStrategy(["plantoid"])
const partyAcceptStrategy = new AcceptPartyRequestStrategy([SUPPORTER_1, SUPPORTER_2])
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
            if (locate === undefined) return // Assume we have it equipped
            return bot.equip(locate, "mainhand")
        }
    }
}

async function startFirehazardFarmer(context: Strategist<PingCompensatedCharacter>, item: ItemName, itemFilters: LocateItemFilters) {
    const farmerAttackStrategy = new BaseAttackStrategy({
        contexts: [],
        couldGiveCredit: true,
        disableZapper: true,
        hpGreaterThan: 10_000,
        maximumTargets: 2,
        type: "plantoid",
        willBurnToDeath: false,
        willDieToProjectiles: false,
    })
    const equipStrategy = new FirehazardEquipStrategy(item, itemFilters)

    context.applyStrategy(equipStrategy)
    context.applyStrategy(baseStrategy)
    context.applyStrategy(farmerAttackStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(debugStrategy)
    context.applyStrategy(moveToMonsterStrategy)
    context.applyStrategy(partyAcceptStrategy)
    context.applyStrategy(trackerStrategy)
}

async function startFirehazardSupporter(context: Strategist<PingCompensatedCharacter>) {
    const moveToBotStrategy = new FollowFriendMoveStrategy(FIREHAZARD_FARMER_CONTEXT)

    const attackStrategyOptions = {
        contexts: [],
        disableZapper: true,
        targetingPlayer: FARMER,
        willBurnToDeath: false,
        willDieToProjectiles: false
    }
    let attackStrategy: Strategy<PingCompensatedCharacter>
    switch (context.bot.ctype) {
        case "priest":
            attackStrategy = new PriestAttackStrategy(attackStrategyOptions)
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