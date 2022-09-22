import AL, { ItemName, Merchant, MonsterName, PingCompensatedCharacter, Priest, Mage, Warrior } from "alclient"
import { DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, startMerchant } from "./merchant/strategy.js"
import { Strategist } from "./strategy_pattern/context.js"
import { PriestAttackStrategy } from "./strategy_pattern/strategies/attack_priest.js"
import { MageAttackStrategy } from "./strategy_pattern/strategies/attack_mage.js"
import { WarriorAttackStrategy } from "./strategy_pattern/strategies/attack_warrior.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import { HoldPositionMoveStrategy, MoveInCircleMoveStrategy } from "./strategy_pattern/strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir.js"
import { PartyHealStrategy } from "./strategy_pattern/strategies/partyheal.js"

await Promise.all([AL.Game.loginJSONFile("././credentials.json"), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: true })

const MERCHANT = "earthMer"
const WARRIOR = "earthWar"
const MAGE = "earthMag"
const PRIEST = "earthPri"

const PARTY_LEADER = "earthWar"
const PARTY_ALLOWLIST = ["earthiverse", "earthMag", "earthPri", "earthWar"]

/** My characters */
const PRIVATE_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
// /** Others that have joined */
// const PUBLIC_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
/** All contexts */
const ALL_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const baseStrategy = new BaseStrategy(ALL_CONTEXTS)
const buyStrategy = new BuyStrategy({
    buyMap: undefined,
    replenishables: new Map<ItemName, number>([
        ["hpot1", 2500],
        ["mpot1", 2500],
        ["xptome", 1],
    ])
})

const privateContextsLogic = () => {
    try {
        for (const context of PRIVATE_CONTEXTS) {
            if (context.isStopped()) continue
            if (!context.bot || !context.bot.ready || !context.bot.socket.disconnected) continue
            if (context.bot.ctype == "merchant") continue

            // TODO: Get target
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(privateContextsLogic, 1000)
    }
}
privateContextsLogic()

const publicContextsLogic = () => {
    try {
        for (const context of PRIVATE_CONTEXTS) {
            if (context.isStopped()) continue
            if (!context.bot || !context.bot.ready || !context.bot.socket.disconnected) continue
            if (context.bot.ctype == "merchant") continue

            // TODO: If full, go to bank and deposit things
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(publicContextsLogic, 1000)
    }
}
publicContextsLogic()

//// Shared strategies
const partyAcceptStrategy = new AcceptPartyRequestStrategy({ allowList: PARTY_ALLOWLIST })
const partyRequestStrategy = new RequestPartyStrategy(WARRIOR)
const trackerStrategy = new TrackerStrategy()
const respawnStrategy = new RespawnStrategy()
async function startShared(context: Strategist<PingCompensatedCharacter>) {
    if (context.bot.id == PARTY_LEADER) {
        context.applyStrategy(partyAcceptStrategy)
    } else {
        context.applyStrategy(partyRequestStrategy)
    }
    context.applyStrategy(buyStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(new ElixirStrategy("elixirluck"))
}

//// Mage strategies
async function startMage(context: Strategist<Mage>) {
    startShared(context)
}

//// Priest strategies
const partyHealStrategy = new PartyHealStrategy(ALL_CONTEXTS)
async function startPriest(context: Strategist<Priest>) {
    startShared(context)
    context.applyStrategy(partyHealStrategy)
}

//// Warrior strategies
async function startWarrior(context: Strategist<Warrior>) {
    startShared(context)
}

// Login and prepare pathfinding
const startMerchantContext = async () => {
    try {
        const merchant = await AL.Game.startMerchant(MERCHANT, "US", "I")
        const MERCHANT_CONTEXT = new Strategist<Merchant>(merchant, baseStrategy)
        startMerchant(MERCHANT_CONTEXT, PRIVATE_CONTEXTS, { ...DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, debug: true, enableUpgrade: true })
        PRIVATE_CONTEXTS.push(MERCHANT_CONTEXT)
        ALL_CONTEXTS.push(MERCHANT_CONTEXT)
    } catch (e) {
        console.error(e)
        setTimeout(startMerchantContext, 10_000)
    }
}
startMerchantContext()

const startWarriorContext = async () => {
    try {
        const warrior = await AL.Game.startWarrior(WARRIOR, "US", "I")
        const WARRIOR_CONTEXT = new Strategist<Warrior>(warrior, baseStrategy)
        startWarrior(WARRIOR_CONTEXT).catch(console.error)
        PRIVATE_CONTEXTS.push(WARRIOR_CONTEXT)
        ALL_CONTEXTS.push(WARRIOR_CONTEXT)
    } catch (e) {
        console.error(e)
        setTimeout(startWarriorContext, 10_000)
    }
}
startWarriorContext()

const startMageContext = async () => {
    try {
        const mage = await AL.Game.startMage(MAGE, "US", "I")
        const RANGER_CONTEXT = new Strategist<Mage>(mage, baseStrategy)
        startMage(RANGER_CONTEXT).catch(console.error)
        PRIVATE_CONTEXTS.push(RANGER_CONTEXT)
        ALL_CONTEXTS.push(RANGER_CONTEXT)
    } catch (e) {
        console.error(e)
        setTimeout(startMageContext, 10_000)
    }
}
startMageContext()

const startPriestContext = async () => {
    try {
        const priest = await AL.Game.startPriest(PRIEST, "US", "I")
        const PRIEST_CONTEXT = new Strategist<Priest>(priest, baseStrategy)
        startPriest(PRIEST_CONTEXT).catch(console.error)
        PRIVATE_CONTEXTS.push(PRIEST_CONTEXT)
        ALL_CONTEXTS.push(PRIEST_CONTEXT)
    } catch (e) {
        console.error(e)
        setTimeout(startPriestContext, 10_000)
    }
}
startPriestContext()