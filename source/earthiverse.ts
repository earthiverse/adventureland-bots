import AL, { ItemName, Merchant, PingCompensatedCharacter, Priest, Mage, Warrior, ServerRegion, ServerIdentifier, MonsterName, ServerInfoDataLive } from "alclient"
import { DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, startMerchant } from "./merchant/strategy.js"
import { Strategist } from "./strategy_pattern/context.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import { FinishMonsterHuntStrategy, GetHolidaySpiritStrategy, GetMonsterHuntStrategy } from "./strategy_pattern/strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir.js"
import { PartyHealStrategy } from "./strategy_pattern/strategies/partyheal.js"
import { Config, constructSetups } from "./strategy_pattern/setups/base.js"

await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Game.getGData(true)])
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

//// Strategies
// Movement
const getHolidaySpiritStrategy = new GetHolidaySpiritStrategy()
const finishMonsterHuntStrategy = new FinishMonsterHuntStrategy()
const getMonsterHuntStrategy = new GetMonsterHuntStrategy()
// Party
const partyAcceptStrategy = new AcceptPartyRequestStrategy({ allowList: PARTY_ALLOWLIST })
const partyRequestStrategy = new RequestPartyStrategy(WARRIOR)
// Priest
const partyHealStrategy = new PartyHealStrategy(ALL_CONTEXTS)
const trackerStrategy = new TrackerStrategy()
const respawnStrategy = new RespawnStrategy()
// Setups
const setups = constructSetups(ALL_CONTEXTS)

const currentSetups = new Map<Strategist<PingCompensatedCharacter>, Config>()
const applySetups = (contexts: Strategist<PingCompensatedCharacter>[]) => {
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
    const S = setupContexts[0].bot.S

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
            for (let i = 0; i < doableWith.length; i++) {
                const context = doableWith[i]
                if (context.bot.ctype == characterConfig.ctype) {
                    const current = currentSetups.get(context)
                    if (current !== config) {
                        if (current) {
                            // Remove the old strategies
                            context.removeStrategy(characterConfig.attack)
                            context.removeStrategy(characterConfig.move)
                        }

                        // Apply the new strategies
                        context.applyStrategy(characterConfig.attack)
                        context.applyStrategy(characterConfig.move)
                        currentSetups.set(context, config)
                    }
                    doableWith.splice(i, 1)
                    continue nextConfig
                }
            }
        }
        return true
    }

    // Priority of targets
    const priority: MonsterName[] = []

    // TODO: Add more event monsters
    if (S.crabxx && (S.crabx as ServerInfoDataLive).live) {
        priority.push("crabxx")
    }

    // Monster hunt targets
    for (const context of PRIVATE_CONTEXTS) {
        if (!context.isReady()) continue
        const bot = context.bot
        if (!bot.s.monsterhunt || bot.s.monsterhunt.c == 0) continue
        priority.push(bot.s.monsterhunt.id)
    }

    // Default targets
    priority.push("plantoid", "croc", "crab", "goo")

    for (const id of priority) {
        if (setupContexts.length == 0) break // All set up
        const setup = setups[id]
        if (!setup) continue // No setup for current
    }

    for (const id in setups) {
        if (setupContexts.length == 0) break // All set up
        const monster = id as MonsterName
        const setup = setups[monster]

        if (!priority.includes(monster)) continue // Not in our priority list
        for (const config of setup.configs) {
            if (applyConfig(config)) break // We found a config that works
        }
    }
}

const privateContextsLogic = () => {
    try {
        const freeContexts: Strategist<PingCompensatedCharacter>[] = []
        for (const context of PRIVATE_CONTEXTS) {
            if (!context.isReady()) continue
            if (context.bot.ctype == "merchant") continue
            const bot = context.bot

            // Get a monster hunt
            if (!bot.s.monsterhunt) {
                context.applyStrategy(getMonsterHuntStrategy)
                continue
            }

            // Turn in our monster hunt
            if (bot.s.monsterhunt?.c == 0) {
                const [region, id] = bot.s.monsterhunt.sn.split(" ") as [ServerRegion, ServerIdentifier]
                if (region == bot.serverData.region && id == bot.serverData.name) {
                    context.applyStrategy(finishMonsterHuntStrategy)
                    continue
                }
            }

            // Holiday spirit
            if (bot.S.holidayseason && !bot.s.holidayspirit) {
                // TODO: implement going to get holiday spirit
                context.applyStrategy(getHolidaySpiritStrategy)
                continue
            }

            freeContexts.push(context)
        }

        applySetups(freeContexts)
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(privateContextsLogic, 1000)
    }
}
privateContextsLogic()

// const publicContextsLogic = () => {
//     try {
//         for (const context of PUBLIC_CONTEXTS) {
//             if (context.isStopped()) continue
//             if (context.bot.ctype == "merchant") continue

//             // TODO: If full, go to bank and deposit things
//         }
//     } catch (e) {
//         console.error(e)
//     } finally {
//         setTimeout(publicContextsLogic, 1000)
//     }
// }
// publicContextsLogic()

// Shared setup
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

// Mage strategies
async function startMage(context: Strategist<Mage>) {
    startShared(context)
}

// Priest setup
async function startPriest(context: Strategist<Priest>) {
    startShared(context)
    context.applyStrategy(partyHealStrategy)
}

// Warrior setup
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