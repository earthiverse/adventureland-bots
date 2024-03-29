import AL, { ItemName, Merchant, PingCompensatedCharacter, ServerRegion, ServerIdentifier, MonsterName, Rogue } from "alclient"
import { DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, startMerchant } from "../merchant/strategy.js"
import { Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { GetHolidaySpiritStrategy } from "../strategy_pattern/strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { ElixirStrategy } from "../strategy_pattern/strategies/elixir.js"
import { Config, constructSetups, Setups } from "../strategy_pattern/setups/base.js"
import { DebugStrategy } from "../strategy_pattern/strategies/debug.js"
import { SellStrategy } from "../strategy_pattern/strategies/sell.js"

import { OptimizeItemsStrategy } from "../strategy_pattern/strategies/item.js"
import { AvoidStackingStrategy } from "../strategy_pattern/strategies/avoid_stacking.js"
import { GiveRogueSpeedStrategy } from "../strategy_pattern/strategies/rspeed.js"

await Promise.all([AL.Game.loginJSONFile("../credentials_attack.json"), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

const DEFAULT_MONSTER: MonsterName = "bee"

const MERCHANT = "attackMer"
const ROGUE_1 = "attackRog"
const ROGUE_2 = "attackRog2"
const ROGUE_3 = "attackRog3"

const PARTY_LEADER = "attackRog"
const PARTY_ALLOWLIST = ["attackRog", "attackRog2", "attackRog3"]

const DEFAULT_REGION: ServerRegion = "US"
const DEFAULT_IDENTIFIER: ServerIdentifier = "I"

/** My characters */
const PRIVATE_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const baseStrategy = new BaseStrategy(PRIVATE_CONTEXTS)
const privateBuyStrategy = new BuyStrategy({
    buyMap: undefined,
    contexts: PRIVATE_CONTEXTS,
    replenishables: new Map<ItemName, number>([
        ["hpot1", 2500],
        ["mpot1", 2500],
        ["xptome", 1],
    ])
})

const privateSellStrategy = new SellStrategy({
    sellMap: new Map<ItemName, [number, number][]>([
        ["cclaw", undefined],
        ["coat1", undefined],
        ["gloves1", undefined],
        ["gphelmet", undefined],
        ["helmet1", undefined],
        ["hpamulet", undefined],
        ["hpbelt", undefined],
        ["iceskates", undefined],
        ["mushroomstaff", undefined],
        ["pants1", undefined],
        ["phelmet", undefined],
        ["pickaxe", [
            [0, 1_000_000]
        ]],
        ["rod", [
            [0, 1_000_000]
        ]],
        ["shoes1", undefined],
        ["slimestaff", undefined],
        ["snowball", undefined],
        ["stand0", undefined],
        ["stramulet", undefined],
        ["strearring", undefined],
        ["vitearring", undefined],
        ["vitring", undefined],
        ["xmace", undefined],
    ])
})

//// Strategies
// Debug
const debugStrategy = new DebugStrategy({
    logLimitDCReport: true
})

// Movement
const avoidStackingStrategy = new AvoidStackingStrategy()
const getHolidaySpiritStrategy = new GetHolidaySpiritStrategy()

const rspeedStrategy = new GiveRogueSpeedStrategy()

// Party
const partyAcceptStrategy = new AcceptPartyRequestStrategy({ allowList: PARTY_ALLOWLIST })
const partyRequestStrategy = new RequestPartyStrategy(PARTY_LEADER)

const trackerStrategy = new TrackerStrategy()
const respawnStrategy = new RespawnStrategy()

// Setups
const privateSetups = constructSetups(PRIVATE_CONTEXTS)
// Etc.
const elixirStrategy = new ElixirStrategy("elixirluck")
const itemStrategy = new OptimizeItemsStrategy()

const currentSetups = new Map<Strategist<PingCompensatedCharacter>, { attack: Strategy<PingCompensatedCharacter>, move: Strategy<PingCompensatedCharacter> }>()
const applySetups = async (contexts: Strategist<PingCompensatedCharacter>[], setups: Setups) => {
    // Setup a list of ready contexts
    const setupContexts = [...contexts]
    for (let i = 0; i < setupContexts.length; i++) {
        const context = setupContexts[i]
        if (!context.isReady()) {
            setupContexts.splice(i, 1)
            i--
        }
    }
    if (setupContexts.length == 0) return

    const isDoable = (config: Config): Strategist<PingCompensatedCharacter>[] | false => {
        const tempContexts = [...setupContexts]
        const doableWith: Strategist<PingCompensatedCharacter>[] = []
        nextConfig:
        for (const characterConfig of config.characters) {
            for (let i = 0; i < tempContexts.length; i++) {
                const context = tempContexts[i]
                if (context.bot.ctype == characterConfig.ctype) {
                    doableWith.push(context)
                    tempContexts.splice(i, 1)
                    continue nextConfig
                }
            }
            return false // Not doable
        }
        return doableWith
    }

    const applyConfig = (config: Config): boolean => {
        const doableWith = isDoable(config)
        if (!doableWith) return false// Not doable
        nextConfig:
        for (const characterConfig of config.characters) {
            for (const context of doableWith) {
                if (context.bot.ctype == characterConfig.ctype) {
                    const current = currentSetups.get(context)

                    if (current) {
                        // Swap the strategies
                        if (current.attack !== characterConfig.attack) {
                            context.removeStrategy(current.attack)
                            context.applyStrategy(characterConfig.attack)
                        }
                        if (current.move !== characterConfig.move) {
                            context.removeStrategy(current.move)

                            // Stop smart moving if we are, so we can do the new strategy movement quicker
                            if (context.bot.smartMoving) context.bot.stopSmartMove().catch(console.error)

                            context.applyStrategy(characterConfig.move)
                        }
                    } else {
                        // Apply the strategy
                        context.applyStrategy(characterConfig.attack)
                        context.applyStrategy(characterConfig.move)
                    }

                    currentSetups.set(context, { attack: characterConfig.attack, move: characterConfig.move })
                    setupContexts.splice(setupContexts.indexOf(context), 1)
                    continue nextConfig
                }
            }
        }
        return true
    }

    // Priority of targets
    const priority: MonsterName[] = []

    // Default targets
    for (const _context of contexts) {
        priority.push(DEFAULT_MONSTER)
    }

    for (const id of priority) {
        if (setupContexts.length == 0) break // All set up
        const setup = setups[id]
        if (!setup) continue // No setup for current

        for (const config of setup.configs) {
            if (applyConfig(config)) {
                break // We found a config that works
            }
        }
    }
}

const removeSetup = (context: Strategist<PingCompensatedCharacter>) => {
    const current = currentSetups.get(context)

    if (current) {
        context.removeStrategy(current.attack)
        context.removeStrategy(current.move)
        currentSetups.delete(context)
    }
}

const contextsLogic = async (contexts: Strategist<PingCompensatedCharacter>[], setups: Setups) => {
    try {
        const freeContexts: Strategist<PingCompensatedCharacter>[] = []

        // Check for server hop
        const bot1 = contexts[0]?.bot
        if (!bot1) return

        for (const context of contexts) {
            if (!context.isReady()) continue
            const bot = context.bot

            if (bot.ctype == "merchant") continue

            // TODO: Add go to bank if full logic

            // Holiday spirit
            if (bot.S.holidayseason && !bot.s.holidayspirit) {
                removeSetup(context)
                context.applyStrategy(getHolidaySpiritStrategy)
                continue
            }

            freeContexts.push(context)
        }

        await applySetups(freeContexts, setups)
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(contextsLogic, 1000, contexts, setups)
    }
}
contextsLogic(PRIVATE_CONTEXTS, privateSetups)

// Shared setup
async function startShared(context: Strategist<PingCompensatedCharacter>) {
    context.applyStrategy(debugStrategy)
    if (context.bot.id == PARTY_LEADER) {
        context.applyStrategy(partyAcceptStrategy)
    } else {
        context.applyStrategy(partyRequestStrategy)
    }

    context.applyStrategy(privateBuyStrategy)
    context.applyStrategy(privateSellStrategy)

    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(elixirStrategy)
    context.applyStrategy(itemStrategy)

}

async function startRogue(context: Strategist<Rogue>) {
    startShared(context)
    context.applyStrategy(rspeedStrategy)
}

// Start my characters
const startMerchantContext = async () => {
    let merchant: Merchant
    try {
        merchant = await AL.Game.startMerchant(MERCHANT, DEFAULT_REGION, DEFAULT_IDENTIFIER)
    } catch (e) {
        if (merchant) merchant.disconnect()
        console.error(e)
        setTimeout(startMerchantContext, 10_000)
    }
    const CONTEXT = new Strategist<Merchant>(merchant, baseStrategy)
    startMerchant(CONTEXT, PRIVATE_CONTEXTS, { ...DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, debug: true, enableBuyAndUpgrade: { upgradeToLevel: 9 }, enableExchange: undefined, enableMluck: { contexts: true, self: true }, enableUpgrade: true })
    CONTEXT.applyStrategy(privateSellStrategy)
    PRIVATE_CONTEXTS.push(CONTEXT)
}
startMerchantContext()

const startRogueContext = async (name: string) => {
    let rogue: Rogue
    try {
        rogue = await AL.Game.startRogue(name, DEFAULT_REGION, DEFAULT_IDENTIFIER)
    } catch (e) {
        if (rogue) rogue.disconnect()
        console.error(e)
        setTimeout(startRogueContext, 10_000)
    }
    const CONTEXT = new Strategist<Rogue>(rogue, baseStrategy)
    startRogue(CONTEXT).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
}
startRogueContext(ROGUE_1)
startRogueContext(ROGUE_2)
startRogueContext(ROGUE_3)