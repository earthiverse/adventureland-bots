import AL, { ItemName, Merchant, MonsterName, PingCompensatedCharacter, Priest, Mage, Warrior } from "alclient"
import { DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, startMerchant } from "../merchant/strategy.js"
import { Strategist } from "../strategy_pattern/context.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"
import { MageAttackStrategy } from "../strategy_pattern/strategies/attack_mage.js"
import { WarriorAttackStrategy } from "../strategy_pattern/strategies/attack_warrior.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { ElixirStrategy } from "../strategy_pattern/strategies/elixir.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

/**
 * Farm sprawlings
 */

const MERCHANT = "earthMer"
const WARRIOR = "earthWar"
const MAGE = "earthMag"
const PRIEST = "earthPri"
const MONSTERS: MonsterName[] = ["plantoid"]

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const baseStrategy = new BaseStrategy(CONTEXTS)
const buyStrategy = new BuyStrategy({
    buyMap: undefined,
    replenishables: new Map<ItemName, number>([
        ["hpot1", 2500],
        ["mpot1", 2500],
        ["xptome", 1],
    ])
})
const partyAcceptStrategy = new AcceptPartyRequestStrategy({ allowList: [MAGE, PRIEST] })
const partyRequestStrategy = new RequestPartyStrategy(WARRIOR)
const trackerStrategy = new TrackerStrategy()
const respawnStrategy = new RespawnStrategy()

async function startMage(context: Strategist<Mage>) {
    context.applyStrategy(buyStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(respawnStrategy)

    // Movement
    const plantoidSpawn = AL.Pathfinder.locateMonster("plantoid")[0]
    plantoidSpawn.x += 5
    context.applyStrategy(new HoldPositionMoveStrategy(plantoidSpawn))

    // Party
    context.applyStrategy(partyRequestStrategy)

    // Attack
    context.applyStrategy(new MageAttackStrategy({ contexts: CONTEXTS, typeList: MONSTERS }))
}

async function startPriest(context: Strategist<Priest>) {
    context.applyStrategy(buyStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(respawnStrategy)

    // Movement
    const plantoidSpawn = AL.Pathfinder.locateMonster("plantoid")[0]
    plantoidSpawn.x -= 5
    context.applyStrategy(new HoldPositionMoveStrategy(plantoidSpawn))

    // Party
    context.applyStrategy(partyRequestStrategy)

    // Attack
    context.applyStrategy(new PriestAttackStrategy({ contexts: CONTEXTS, typeList: MONSTERS }))
}

async function startWarrior(context: Strategist<Warrior>) {
    context.applyStrategy(buyStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(respawnStrategy)

    // Movement
    const plantoidSpawn = AL.Pathfinder.locateMonster("plantoid")[0]
    context.applyStrategy(new MoveInCircleMoveStrategy({ center: plantoidSpawn, radius: 20, sides: 8 }))

    // Party
    context.applyStrategy(partyAcceptStrategy)

    // Attack
    context.applyStrategy(new WarriorAttackStrategy({ contexts: CONTEXTS, typeList: MONSTERS }))

    // Luck
    context.applyStrategy(new ElixirStrategy("elixirluck"))

    // TODO: Move this to a move strategy
    setInterval(async () => {
        try {
            if (!context.bot || !context.bot.ready) return
            const bot = context.bot

            if (bot.canUse("zapperzap")) {
                const entity = bot.getEntity({ couldGiveCredit: true, targetingPartyMember: false, typeList: MONSTERS, withinRange: "zapperzap" })
                if (entity) await bot.zapperZap(entity.id)
            }

            if (bot.canUse("taunt")) {
                const entity = bot.getEntity({ targetingMe: false, targetingPartyMember: true, typeList: MONSTERS, withinRange: "taunt" })
                if (entity) await bot.taunt(entity.id)
            }
        } catch (e) {
            console.error(e)
        }
    }, 250)
}

// Login and prepare pathfinding
const merchant = await AL.Game.startMerchant(MERCHANT, "US", "I")
const MERCHANT_CONTEXT = new Strategist<Merchant>(merchant, baseStrategy)
startMerchant(MERCHANT_CONTEXT, CONTEXTS, { ...DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, debug: true, enableUpgrade: true })
CONTEXTS.push(MERCHANT_CONTEXT)

const warrior = await AL.Game.startWarrior(WARRIOR, "US", "I")
const WARRIOR_CONTEXT = new Strategist<Warrior>(warrior, baseStrategy)
startWarrior(WARRIOR_CONTEXT).catch(console.error)
CONTEXTS.push(WARRIOR_CONTEXT)

const mage = await AL.Game.startMage(MAGE, "US", "I")
const RANGER_CONTEXT = new Strategist<Mage>(mage, baseStrategy)
startMage(RANGER_CONTEXT).catch(console.error)
CONTEXTS.push(RANGER_CONTEXT)

const priest = await AL.Game.startPriest(PRIEST, "US", "I")
const PRIEST_CONTEXT = new Strategist<Priest>(priest, baseStrategy)
startPriest(PRIEST_CONTEXT).catch(console.error)
CONTEXTS.push(PRIEST_CONTEXT)