import AL, {
    Attribute,
    CharacterType,
    IPosition,
    ItemName,
    Mage,
    Merchant,
    MonsterName,
    Paladin,
    PingCompensatedCharacter,
    Priest,
    Ranger,
    Rogue,
    ServerIdentifier,
    ServerInfoDataLive,
    ServerRegion,
    Warrior,
} from "alclient"
import { randomIntFromInterval, sleep } from "../base/general.js"
import { DEFAULT_ITEM_CONFIG } from "../base/itemsNew.js"
import { defaultNewMerchantStrategyOptions, NewMerchantStrategy } from "../merchant/strategy.js"
import { Strategist, Strategy } from "../strategy_pattern/context.js"
import { Config, constructGenericSetup, constructSetups, Setups } from "../strategy_pattern/setups/base.js"
import { AvoidDeathStrategy } from "../strategy_pattern/strategies/avoid_death.js"
import { AvoidStackingStrategy } from "../strategy_pattern/strategies/avoid_stacking.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { ChargeStrategy } from "../strategy_pattern/strategies/charge.js"
import { DestroyStrategy } from "../strategy_pattern/strategies/destroy.js"
import { ElixirStrategy } from "../strategy_pattern/strategies/elixir.js"
import { ItemStrategy } from "../strategy_pattern/strategies/item.js"
import { MagiportOthersSmartMovingToUsStrategy } from "../strategy_pattern/strategies/magiport.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { PartyHealStrategy } from "../strategy_pattern/strategies/partyheal.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { GiveRogueSpeedStrategy } from "../strategy_pattern/strategies/rspeed.js"
import { SellStrategy } from "../strategy_pattern/strategies/sell.js"
import { ToggleStandStrategy } from "../strategy_pattern/strategies/stand.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"

process.on("unhandledRejection", (reason) => {
    console.error("[Runner] Unhandled promise rejection:", reason)
})

process.on("uncaughtException", (error) => {
    console.error("[Runner] Uncaught exception:", error)
})

interface RunnerConfig {
    userId: string
    userAuth: string
    characters: string[]
    region: ServerRegion
    identifier: ServerIdentifier
    monster: MonsterName
    useBankB: boolean
    useBankU: boolean
    doEvents: boolean
}

if (!process.argv[2]) {
    console.error("[Runner] No configuration payload provided. Exiting.")
    process.exit(1)
}

let config: RunnerConfig
try {
    const raw = Buffer.from(process.argv[2], "base64").toString("utf-8")
    config = JSON.parse(raw)
} catch (e) {
    console.error("[Runner] Failed to decode runner configuration:", e)
    process.exit(1)
}

console.log(`[Runner] Starting independent runner for characters: ${config.characters.join(", ")} on ${config.region} ${config.identifier}`)
console.log(`[Runner] Target monster: ${config.monster} | Events: ${config.doEvents} | Bank B: ${config.useBankB} | Bank U: ${config.useBankU}`)

// Configure AL user credentials
AL.Game.user = {
    userID: config.userId,
    userAuth: config.userAuth,
    secure: true,
}

// Global active contexts & setup cache
const activeContexts: Strategist<PingCompensatedCharacter>[] = []
const currentSetups = new Map<
    Strategist<PingCompensatedCharacter>,
    { attack: Strategy<PingCompensatedCharacter>; move: Strategy<PingCompensatedCharacter> }
>()

let baseStrategy: BaseStrategy<PingCompensatedCharacter>
let avoidDeathStrategy: AvoidDeathStrategy<PingCompensatedCharacter>
let avoidStackingStrategy: AvoidStackingStrategy<PingCompensatedCharacter>
let respawnStrategy: RespawnStrategy<PingCompensatedCharacter>
let trackerStrategy: TrackerStrategy
let elixirStrategy: ElixirStrategy<PingCompensatedCharacter>
let buyStrategy: BuyStrategy<PingCompensatedCharacter>
let sellStrategy: SellStrategy<PingCompensatedCharacter>
let itemStrategy: ItemStrategy<PingCompensatedCharacter>
let destroyStrategy: DestroyStrategy<PingCompensatedCharacter>

let partyLeader: string
let partyAcceptStrategy: AcceptPartyRequestStrategy<PingCompensatedCharacter>
let partyRequestStrategy: RequestPartyStrategy<PingCompensatedCharacter>

let chargeStrategy: ChargeStrategy
let partyHealStrategy: PartyHealStrategy
let rSpeedStrategy: GiveRogueSpeedStrategy
let magiportStrategy: MagiportOthersSmartMovingToUsStrategy

let setups: Setups = {}
let genericFallbackSetup: ReturnType<typeof constructGenericSetup>

class DisconnectOnCommandStrategy implements Strategy<PingCompensatedCharacter> {
    private onCodeEvals = new Map<string, (data: string) => Promise<void>>()

    public onApply(bot: PingCompensatedCharacter) {
        const handler = async (data: string) => {
            data = typeof data === "string" ? data.toLowerCase().trim() : ""
            if (data === "stop" || data === "disconnect") {
                console.log(`[Runner] Received '${data}' command from ${bot.id}. Shutting down all characters and exiting runner process...`)
                for (const context of activeContexts) {
                    try {
                        context.stop()
                        context.bot?.disconnect()
                    } catch {
                        // Ignore disconnect errors during exit
                    }
                }
                process.exit(0)
            }
        }
        this.onCodeEvals.set(bot.id, handler)
        bot.socket.on("code_eval", handler)
    }

    public onRemove(bot: PingCompensatedCharacter) {
        const handler = this.onCodeEvals.get(bot.id)
        if (handler) {
            bot.socket.removeListener("code_eval", handler)
            this.onCodeEvals.delete(bot.id)
        }
    }
}
const disconnectOnCommandStrategy = new DisconnectOnCommandStrategy()

// Apply shared strategies to any character context
function applyBaseCharacterStrategies(context: Strategist<PingCompensatedCharacter>) {
    context.applyStrategy(avoidDeathStrategy)
    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(elixirStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(sellStrategy)
    context.applyStrategy(itemStrategy)
    context.applyStrategy(destroyStrategy)
    context.applyStrategy(disconnectOnCommandStrategy)

    // Party strategies
    if (context.bot.id === partyLeader) {
        context.applyStrategy(partyAcceptStrategy)
    } else {
        context.applyStrategy(partyRequestStrategy)
    }

    // Class specific utility strategies
    switch (context.bot.ctype) {
        case "mage":
            context.applyStrategy(magiportStrategy)
            break
        case "priest":
            context.applyStrategy(partyHealStrategy)
            break
        case "rogue":
            context.applyStrategy(rSpeedStrategy)
            break
        case "warrior":
            context.applyStrategy(chargeStrategy)
            break
        case "merchant": {
            const defaultPosition: IPosition = {
                map: "main",
                x: randomIntFromInterval(-100, -50),
                y: randomIntFromInterval(-50, 50),
            }
            context.applyStrategy(
                new NewMerchantStrategy({
                    ...defaultNewMerchantStrategyOptions,
                    contexts: activeContexts,
                    itemConfig: DEFAULT_ITEM_CONFIG,
                    defaultPosition,
                    goldToHold: 50_000_000,
                }),
            )
            context.applyStrategy(
                new ToggleStandStrategy({
                    offWhenMoving: true,
                    onWhenNear: [{ distance: 10, position: defaultPosition }],
                }),
            )
            break
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

const isDoable = (configOption: Config, setupContexts: Strategist<PingCompensatedCharacter>[]): Strategist<PingCompensatedCharacter>[] | false => {
    const tempContexts = [...setupContexts]
    const doableWith: Strategist<PingCompensatedCharacter>[] = []
    nextConfigCharacter: for (const characterConfig of configOption.characters) {
        nextContext: for (let i = 0; i < tempContexts.length; i++) {
            const context = tempContexts[i]
            if (context.bot.ctype !== characterConfig.ctype) continue
            if (characterConfig.require) {
                if (characterConfig.require.level && context.bot.level < characterConfig.require.level) {
                    continue nextContext
                }
                for (const a in characterConfig.require) {
                    if (a === "items" || a === "level") continue
                    const attribute = a as Attribute
                    if (context.bot[attribute] < characterConfig.require[attribute]) continue nextContext
                }
                for (const itemName of characterConfig.require.items ?? []) {
                    if (!(context.bot.isEquipped(itemName) || context.bot.hasItem(itemName))) continue nextContext
                }
            }

            doableWith.push(context)
            tempContexts.splice(i, 1)
            continue nextConfigCharacter
        }
        return false
    }
    return doableWith
}

const applyConfig = (
    configOption: Config,
    setupContexts: Strategist<PingCompensatedCharacter>[],
): boolean => {
    const doableWith = isDoable(configOption, setupContexts)
    if (!doableWith) return false
    nextConfig: for (const characterConfig of configOption.characters) {
        for (const context of doableWith) {
            if (context.bot.ctype === characterConfig.ctype) {
                const current = currentSetups.get(context)
                if (current) {
                    if (current.attack !== characterConfig.attack) {
                        context.removeStrategy(current.attack)
                        context.applyStrategy(characterConfig.attack)
                    }
                    if (current.move !== characterConfig.move) {
                        context.removeStrategy(current.move)
                        if (context.bot.smartMoving) context.bot.stopSmartMove().catch(console.error)
                        context.applyStrategy(characterConfig.move)
                    }
                } else {
                    context.applyStrategy(characterConfig.attack)
                    context.applyStrategy(characterConfig.move)
                }

                currentSetups.set(context, { attack: characterConfig.attack, move: characterConfig.move })
                doableWith.splice(doableWith.indexOf(context), 1)
                setupContexts.splice(setupContexts.indexOf(context), 1)
                continue nextConfig
            }
        }
    }
    return true
}

const applySetups = async (contexts: Strategist<PingCompensatedCharacter>[]) => {
    const setupContexts = [...contexts]
    const priority: MonsterName[] = []

    if (config.doEvents) {
        for (const context of contexts) {
            // Goo brawl
            if (context.bot.S.goobrawl && !context.bot.s.hopsickness && !context.bot.map.startsWith("bank")) {
                priority.push("rgoo")
            }
            // Lunar New Year
            if (context.bot.S.lunarnewyear) {
                if ((context.bot.S.dragold as ServerInfoDataLive)?.live) priority.push("dragold")
                if ((context.bot.S.tiger as ServerInfoDataLive)?.live) priority.push("tiger")
            }
            // Valentines
            if (context.bot.S.valentines) {
                if ((context.bot.S.pinkgoo as ServerInfoDataLive)?.live) priority.push("pinkgoo")
            }
            // Easter
            if (context.bot.S.egghunt) {
                if ((context.bot.S.wabbit as ServerInfoDataLive)?.live) priority.push("wabbit")
            }
            // Halloween
            if (context.bot.S.halloween) {
                if ((context.bot.S.mrgreen as ServerInfoDataLive)?.live) priority.push("mrgreen")
                if ((context.bot.S.mrpumpkin as ServerInfoDataLive)?.live) priority.push("mrpumpkin")
            }
            // Christmas
            if (context.bot.S.holidayseason) {
                if ((context.bot.S.grinch as ServerInfoDataLive)?.live) priority.push("grinch")
            }
            // Bosses
            if ((context.bot.S.franky as ServerInfoDataLive)?.live) priority.push("franky")
            if ((context.bot.S.icegolem as ServerInfoDataLive)?.live) priority.push("icegolem")
            if ((context.bot.S.crabxx as ServerInfoDataLive)?.live) priority.push("crabxx")
            if ((context.bot.S.snowman as ServerInfoDataLive)?.live) priority.push("snowman")
        }
    }

    // Target monster
    for (const _c of contexts) {
        priority.push(config.monster)
    }

    for (const id of priority) {
        if (setupContexts.length === 0) break
        const setup = setups[id]
        if (setup) {
            for (const c of setup.configs) {
                if (applyConfig(c, setupContexts)) break
            }
        } else if (genericFallbackSetup) {
            for (const c of genericFallbackSetup.configs) {
                if (applyConfig(c, setupContexts)) break
            }
        }
    }
}

// Main logic loop running every 1000ms
const contextsLogic = async () => {
    try {
        const freeContexts: Strategist<PingCompensatedCharacter>[] = []
        for (const context of activeContexts) {
            if (!context.isReady() || !context.bot.ready || context.bot.rip) continue
            if (context.bot.ctype === "merchant") continue // Merchant handled by merchant strategy
            freeContexts.push(context)
        }

        if (freeContexts.length > 0) {
            await applySetups(freeContexts)
        }
    } catch (e) {
        console.error("[Runner] Error in contextsLogic:", e)
    } finally {
        setTimeout(contextsLogic, 1000)
    }
}

// Disconnect/crash auto-recovery worker for an individual character
async function runCharacterLoop(characterName: string) {
    while (true) {
        let bot: PingCompensatedCharacter | undefined
        let context: Strategist<PingCompensatedCharacter> | undefined
        try {
            console.log(`[Runner] Connecting character ${characterName}...`)
            await AL.Game.updateServersAndCharacters()

            const charData = AL.Game.characters[characterName]
            if (!charData) {
                console.error(`[Runner] Character '${characterName}' not found in account! Retrying in 30s...`)
                await sleep(30_000)
                continue
            }

            if (charData.online) {
                console.log(`[Runner] '${characterName}' is reported online. Waiting 10s before connect...`)
                await sleep(10_000)
            }

            bot = await AL.Game.startCharacter(characterName, config.region, config.identifier)
            context = new Strategist(bot, baseStrategy)
            activeContexts.push(context)

            // Rebuild setups map with current active contexts
            setups = constructSetups(activeContexts)
            genericFallbackSetup = constructGenericSetup(activeContexts, [config.monster], true)

            applyBaseCharacterStrategies(context)
            console.log(`[Runner] Character ${characterName} (${bot.ctype}) successfully connected!`)

            // Keep running while the context is active; Strategist handles socket reconnecting automatically
            while (!context.isStopped()) {
                await sleep(2000)
            }

            console.warn(`[Runner] Context for ${characterName} stopped. Cleaning up...`)
        } catch (err) {
            console.error(`[Runner] Error in character loop for ${characterName}:`, err)
        } finally {
            if (context) {
                removeSetup(context)
                context.stop()
                const idx = activeContexts.indexOf(context)
                if (idx >= 0) activeContexts.splice(idx, 1)
                // Rebuild setups map without this context
                setups = constructSetups(activeContexts)
                genericFallbackSetup = constructGenericSetup(activeContexts, [config.monster], true)
            }
            if (bot && bot.ready) {
                try {
                    bot.disconnect()
                } catch {
                    // Ignore disconnect errors during cleanup
                }
            }
        }

        console.log(`[Runner] Reconnecting ${characterName} in 5 seconds...`)
        await sleep(5000)
    }
}

// Main startup function
async function start() {
    console.log("[Runner] Fetching G data and preparing pathfinder...")
    await Promise.all([AL.Game.getGData(true), AL.Game.updateServersAndCharacters()])

    await AL.Pathfinder.prepare(AL.Game.G, {
        cheat: true,
        remove_abtesting: true,
        remove_test: true,
        remove_bank_b: !config.useBankB,
        remove_bank_u: !config.useBankU,
    })

    console.log(`[Runner] Pathfinder prepared (remove_bank_b: ${!config.useBankB}, remove_bank_u: ${!config.useBankU})`)

    baseStrategy = new BaseStrategy(activeContexts)
    avoidDeathStrategy = new AvoidDeathStrategy()
    avoidStackingStrategy = new AvoidStackingStrategy()
    respawnStrategy = new RespawnStrategy()
    trackerStrategy = new TrackerStrategy()
    elixirStrategy = new ElixirStrategy("elixirluck")
    buyStrategy = new BuyStrategy({ contexts: activeContexts, itemConfig: DEFAULT_ITEM_CONFIG })
    sellStrategy = new SellStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
    itemStrategy = new ItemStrategy({ contexts: activeContexts, itemConfig: DEFAULT_ITEM_CONFIG })
    destroyStrategy = new DestroyStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })

    partyLeader = config.characters[0]
    partyAcceptStrategy = new AcceptPartyRequestStrategy()
    partyRequestStrategy = new RequestPartyStrategy(partyLeader)

    chargeStrategy = new ChargeStrategy()
    partyHealStrategy = new PartyHealStrategy(activeContexts)
    rSpeedStrategy = new GiveRogueSpeedStrategy()
    magiportStrategy = new MagiportOthersSmartMovingToUsStrategy(activeContexts)

    // Start strategy loop
    setTimeout(contextsLogic, 1000)

    // Launch each character loop concurrently
    for (const characterName of config.characters) {
        runCharacterLoop(characterName).catch((err) => {
            console.error(`[Runner] Fatal error in loop for ${characterName}:`, err)
        })
        // Stagger character connections slightly
        await sleep(2500)
    }
}

start().catch((err) => {
    console.error("[Runner] Startup error:", err)
    process.exit(1)
})
