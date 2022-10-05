import AL, { ItemName, Merchant, PingCompensatedCharacter, Priest, Mage, Warrior, ServerRegion, ServerIdentifier, MonsterName, ServerInfoDataLive } from "alclient"
import { DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, startMerchant } from "./merchant/strategy.js"
import { Strategist, Strategy } from "./strategy_pattern/context.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import { FinishMonsterHuntStrategy, GetHolidaySpiritStrategy, GetMonsterHuntStrategy } from "./strategy_pattern/strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir.js"
import { PartyHealStrategy } from "./strategy_pattern/strategies/partyheal.js"
import { Config, constructSetups } from "./strategy_pattern/setups/base.js"
import { DebugStrategy } from "./strategy_pattern/strategies/debug.js"
import { getHalloweenMonsterPriority } from "./base/serverhop.js"
import { sleep } from "./base/general.js"

await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: true })

// TODO: Make these configurable through /comm using a similar system to how lulz works
// Toggles
const ENABLE_EVENTS = true
const ENABLE_SERVER_HOPS = true
const ENABLE_SPECIAL_MONSTERS = true
const ENABLE_MONSTERHUNTS = false

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
// Debug
const debugStrategy = new DebugStrategy({
    logLimitDCReport: true
})
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

const currentSetups = new Map<Strategist<PingCompensatedCharacter>, { attack: Strategy<PingCompensatedCharacter>, move: Strategy<PingCompensatedCharacter> }>()
const applySetups = async (contexts: Strategist<PingCompensatedCharacter>[]) => {
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
    const serverData = setupContexts[0].bot.serverData
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

    if (ENABLE_SPECIAL_MONSTERS) {
        if (S.halloween) {
            // Only target `jr` and `greenjr` during halloween
            for (const specialMonster of await AL.EntityModel.find({
                lastSeen: { $gt: Date.now() - 30000 },
                serverIdentifier: serverData.name,
                serverRegion: serverData.region,
                type: { $in: ["greenjr", "jr"] }
            }, {
                type: 1
            }).lean().exec()) {
                priority.push(specialMonster.type)
            }
        }
    }

    if (ENABLE_EVENTS) {
        if (S.halloween) {
            if ((S.mrgreen as ServerInfoDataLive).live) {
                if ((S.mrpumpkin as ServerInfoDataLive).live) {
                    // Both are alive, target the lower hp one
                    if ((S.mrgreen as ServerInfoDataLive).hp > (S.mrpumpkin as ServerInfoDataLive).hp) {
                        priority.push("mrpumpkin", "mrgreen")
                    } else {
                        priority.push("mrgreen", "mrpumpkin")
                    }
                } else {
                    // Only mrgreen is alive
                    priority.push("mrgreen")
                }
            } else if ((S.mrpumpkin as ServerInfoDataLive).live) {
                // Only mrpumpkin is alive
                priority.push("mrpumpkin")
            }
        }

        for (const id in S) {
            if (!AL.Game.G.monsters[id]) continue // Not a monster
            if ((S[id] as ServerInfoDataLive)?.live) {
                priority.push(id as MonsterName)
            }
        }

        if (S.goobrawl) priority.push("rgoo")
    }

    if (ENABLE_MONSTERHUNTS) {
        // TODO: Sort these by time remaining
        // Monster hunt targets
        for (const context of PRIVATE_CONTEXTS) {
            if (!context.isReady()) continue
            const bot = context.bot
            if (!bot.s.monsterhunt || bot.s.monsterhunt.c == 0) continue
            priority.push(bot.s.monsterhunt.id)
        }
    }

    // Default targets
    priority.push("bscorpion", "croc", "crab", "goo")

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

const privateContextsLogic = async () => {
    try {
        const freeContexts: Strategist<PingCompensatedCharacter>[] = []

        for (const context of PRIVATE_CONTEXTS) {
            if (!context.isReady()) continue
            const bot = context.bot

            if (ENABLE_SERVER_HOPS) {
                if (bot.S.halloween) {
                    const monster = (await getHalloweenMonsterPriority())[0]
                    if (
                        context.uptime() > 60_000
                        && monster
                        && (
                            monster.serverRegion !== bot.serverData.region
                            || monster.serverIdentifier !== bot.serverData.name
                        )
                    ) {
                        // We want to switch servers
                        await sleep(1000)
                        console.log(bot.id, "is changing server from", bot.serverData.region, bot.serverData.name, "to", monster.serverRegion, monster.serverIdentifier)
                        context.changeServer(monster.serverRegion, monster.serverIdentifier).catch(console.error)
                        return
                    }
                }
            }

            if (bot.ctype == "merchant") continue

            if (ENABLE_MONSTERHUNTS) {
                // Get a monster hunt
                if (!bot.s.monsterhunt) {
                    removeSetup(context)
                    context.applyStrategy(getMonsterHuntStrategy)
                    continue
                }

                // Turn in our monster hunt
                if (bot.s.monsterhunt?.c == 0) {
                    const [region, id] = bot.s.monsterhunt.sn.split(" ") as [ServerRegion, ServerIdentifier]
                    if (region == bot.serverData.region && id == bot.serverData.name) {
                        removeSetup(context)
                        context.applyStrategy(finishMonsterHuntStrategy)
                        continue
                    }
                }
            }

            // Holiday spirit
            if (bot.S.holidayseason && !bot.s.holidayspirit) {
                // TODO: implement going to get holiday spirit
                removeSetup(context)
                context.applyStrategy(getHolidaySpiritStrategy)
                continue
            }

            // Stay on goobrawl if there are still monsters around
            if (bot.map == "goobrawl" && bot.getEntities({ typeList: ["bgoo", "rgoo"] }).length > 0) {
                removeSetup(context)
                continue
            }

            freeContexts.push(context)
        }

        await applySetups(freeContexts)
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
    context.applyStrategy(debugStrategy)
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
    let merchant: Merchant
    try {
        merchant = await AL.Game.startMerchant(MERCHANT, "US", "I")
    } catch (e) {
        if (merchant) merchant.disconnect()
        console.error(e)
        setTimeout(startMerchantContext, 10_000)
    }
    const CONTEXT = new Strategist<Merchant>(merchant, baseStrategy)
    startMerchant(CONTEXT, PRIVATE_CONTEXTS, { ...DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS, debug: true, enableUpgrade: true })
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
startMerchantContext()

const startWarriorContext = async () => {
    let warrior: Warrior
    try {
        warrior = await AL.Game.startWarrior(WARRIOR, "US", "I")
    } catch (e) {
        if (warrior) warrior.disconnect()
        console.error(e)
        setTimeout(startWarriorContext, 10_000)
    }
    const CONTEXT = new Strategist<Warrior>(warrior, baseStrategy)
    startWarrior(CONTEXT).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
startWarriorContext()

const startMageContext = async () => {
    let mage: Mage
    try {
        mage = await AL.Game.startMage(MAGE, "US", "I")
    } catch (e) {
        if (mage) mage.disconnect()
        console.error(e)
        setTimeout(startMageContext, 10_000)
    }
    const CONTEXT = new Strategist<Mage>(mage, baseStrategy)
    startMage(CONTEXT).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
startMageContext()

const startPriestContext = async () => {
    let priest: Priest
    try {
        priest = await AL.Game.startPriest(PRIEST, "US", "I")
    } catch (e) {
        if (priest) priest.disconnect()
        console.error(e)
        setTimeout(startPriestContext, 10_000)
    }
    const CONTEXT = new Strategist<Priest>(priest, baseStrategy)
    startPriest(CONTEXT).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
startPriestContext()