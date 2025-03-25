import AL, {
    Attribute,
    CharacterType,
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
import { randomIntFromInterval, sleep } from "./base/general.js"
import {
    getHalloweenMonsterPriority,
    getHolidaySeasonMonsterPriority,
    getLunarNewYearMonsterPriority,
    getServerHopMonsterPriority,
    getValentinesMonsterPriority,
} from "./base/serverhop.js"
import { defaultNewMerchantStrategyOptions, NewMerchantStrategyOptions, startMerchant } from "./merchant/strategy.js"
import { filterContexts, Strategist, Strategy } from "./strategy_pattern/context.js"
import { Config, constructHelperSetups, constructSetups, Setups } from "./strategy_pattern/setups/base.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import { DebugStrategy } from "./strategy_pattern/strategies/debug.js"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir.js"
import {
    MagiportOthersSmartMovingToUsStrategy,
    MagiportServiceStrategy,
} from "./strategy_pattern/strategies/magiport.js"
import {
    FinishMonsterHuntStrategy,
    GetHolidaySpiritStrategy,
    GetMonsterHuntStrategy,
} from "./strategy_pattern/strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party.js"
import { PartyHealStrategy } from "./strategy_pattern/strategies/partyheal.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { SellStrategy } from "./strategy_pattern/strategies/sell.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"

import bodyParser from "body-parser"
import cors from "cors"
import express from "express"
import { body, validationResult } from "express-validator"
import fs from "fs"
import path from "path"
import { CRYPT_MONSTERS } from "./base/crypt.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION } from "./base/defaults.js"
import {
    adjustItemConfig,
    DEFAULT_ITEM_CONFIG,
    ItemConfig,
    REPLENISH_ITEM_CONFIG,
    runSanityCheckOnItemConfig,
} from "./base/itemsNew.js"
import { getRecentCryptMonsters, getRecentSpecialMonsters, getRecentXMages } from "./base/monsters.js"
import { XMAGE_MONSTERS } from "./strategy_pattern/setups/xmage.js"
import { AvoidDeathStrategy } from "./strategy_pattern/strategies/avoid_death.js"
import { AvoidStackingStrategy } from "./strategy_pattern/strategies/avoid_stacking.js"
import { ChargeStrategy } from "./strategy_pattern/strategies/charge.js"
import { DestroyStrategy, MerchantDestroyStrategy } from "./strategy_pattern/strategies/destroy.js"
import { GuiStrategy } from "./strategy_pattern/strategies/gui.js"
import { HomeServerStrategy } from "./strategy_pattern/strategies/home_server.js"
import { ItemStrategy } from "./strategy_pattern/strategies/item.js"
import { GiveRogueSpeedStrategy } from "./strategy_pattern/strategies/rspeed.js"
import { TrackUpgradeStrategy } from "./strategy_pattern/strategies/statistics.js"

await Promise.all([AL.Game.loginJSONFile("../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G, { remove_abtesting: true, remove_test: true, cheat: true })

// TODO: Make these configurable through /comm using a similar system to how lulz works
// Toggles
const ENABLE_EVENTS = true
const ENABLE_SERVER_HOPS = true
const ENABLE_SPECIAL_MONSTERS = true
let ENABLE_MONSTERHUNTS = true
const DEFAULT_MONSTERS: MonsterName[] = ["wolf"]
const SPECIAL_MONSTERS: MonsterName[] = [
    "crabxx",
    "cutebee",
    "franky",
    "fvampire",
    "goldenbat",
    "greenjr",
    "icegolem",
    "jr",
    "mvampire",
    "rharpy",
    "skeletor",
    "snowman",
    "stompy",
    "tinyp",
    "wabbit",
]
const MAX_PUBLIC_CHARACTERS = 6

const MERCHANT: string = "earthMer" // earthMer, earthMer2, earthMer3
const WARRIORS: string[] = ["earthWar"] // earthWar, earthWar2, earthWar3
const MAGES: string[] = ["earthMag"] // earthMag, earthMag2, earthMag3
const PRIESTS: string[] = ["earthPri"] // earthPri, earthPri2
const RANGERS: string[] = [] // earthiverse, earthRan2, earthRan3
const PALADINS: string[] = [] // earthPal
const ROGUES: string[] = [] // earthRog, earthRog2, earthRog3

const PARTY_ALLOWLIST: string[] = [...WARRIORS, ...RANGERS, ...MAGES, ...PRIESTS, ...PALADINS, ...ROGUES]
const PARTY_LEADER: string = PARTY_ALLOWLIST[0]

// Sanity checks
if (PARTY_LEADER === undefined) throw new Error("We don't have a party leader set!")
if (PARTY_ALLOWLIST.length < 3) throw new Error(`We're only using ${PARTY_ALLOWLIST.length} attacking characters!`)
if (PARTY_ALLOWLIST.length > 3)
    throw new Error(`Don't use more than 3 attacking characters! (Currently set up with ${PARTY_ALLOWLIST.join("/")})`)

let TARGET_REGION: ServerRegion = DEFAULT_REGION
let TARGET_IDENTIFIER: ServerIdentifier = DEFAULT_IDENTIFIER

const PUBLIC_FIELDS = ["ctype", "owner", "userAuth", "characterID"]
const PUBLIC_CSV = "public.csv"

/** My characters */
const PRIVATE_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
// /** Others that have joined */
const PUBLIC_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
/** All contexts */
const ALL_CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
const SETTINGS_CACHE: Record<string, PublicSettings> = {}

const guiStrategy = new GuiStrategy({ port: 8080 })
const baseStrategy = new BaseStrategy(ALL_CONTEXTS)
const privateBuyStrategy = new BuyStrategy({
    contexts: PRIVATE_CONTEXTS,
    itemConfig: DEFAULT_ITEM_CONFIG,
    enableBuyForProfit: true,
})
adjustItemConfig(DEFAULT_ITEM_CONFIG)

const privateSellStrategy = new SellStrategy()

//// Strategies
// Debug
const debugStrategy = new DebugStrategy({
    writeToFile: true,
    logInstances: true,
    logLimitDCReport: true,
})
// Movement
const avoidDeathStrategy = new AvoidDeathStrategy()
const avoidStackingStrategy = new AvoidStackingStrategy()
const getHolidaySpiritStrategy = new GetHolidaySpiritStrategy()
const finishMonsterHuntStrategy = new FinishMonsterHuntStrategy()
const getMonsterHuntStrategy = new GetMonsterHuntStrategy()
// Party
const partyAcceptStrategy =
    new AcceptPartyRequestStrategy(/** TODO: TEMP: Allow anyone to join { allowList: PARTY_ALLOWLIST } */)
const partyRequestStrategy = new RequestPartyStrategy(PARTY_LEADER)
// Mage
const magiportStrategy = new MagiportOthersSmartMovingToUsStrategy(ALL_CONTEXTS)
const magiportServiceStrategy = new MagiportServiceStrategy()
// Merchant
const merchantDestroyStrategy = new MerchantDestroyStrategy()
// Priest
const privatePartyHealStrategy = new PartyHealStrategy(PRIVATE_CONTEXTS)
const publicPartyHealStrategy = new PartyHealStrategy(ALL_CONTEXTS)
const trackerStrategy = new TrackerStrategy()
const respawnStrategy = new RespawnStrategy()
// Rogue
const rspeedStrategy = new GiveRogueSpeedStrategy()
// Warrior
const chargeStrategy = new ChargeStrategy()
// Setups
const privateSetups = constructSetups(ALL_CONTEXTS)
const publicSetups = constructHelperSetups(ALL_CONTEXTS)
// Etc.
const destroyStrategy = new DestroyStrategy()
const elixirStrategy = new ElixirStrategy("elixirluck")
const homeServerStrategy = new HomeServerStrategy(DEFAULT_REGION, DEFAULT_IDENTIFIER)
const privateItemStrategy = new ItemStrategy({
    contexts: PRIVATE_CONTEXTS,
    itemConfig: DEFAULT_ITEM_CONFIG,
})
const upgradeStatisticsStrategy = new TrackUpgradeStrategy()

let OVERRIDE_MONSTERS: MonsterName[]
let OVERRIDE_REGION: ServerRegion
let OVERRIDE_IDENTIFIER: ServerIdentifier
class OverrideStrategy implements Strategy<PingCompensatedCharacter> {
    private onCodeEval: (data: string) => Promise<void>

    public onApply(bot: PingCompensatedCharacter) {
        this.onCodeEval = async (data: string) => {
            const args = data.split(" ")
            switch (args[0].toLowerCase()) {
                case "monster":
                    OVERRIDE_MONSTERS = []
                    if (args.length > 1) {
                        for (let i = 1; i < args.length; i++) {
                            OVERRIDE_MONSTERS.push(args[i].toLowerCase() as MonsterName)
                        }
                        console.log(`Overriding monsters to [${OVERRIDE_MONSTERS.join(", ")}]`)
                    } else {
                        console.log("Clearing monster override...")
                    }
                    break
                case "monsterhunt":
                    if ((!ENABLE_MONSTERHUNTS && args[1] == "on") || args[1] == "true") {
                        console.log("Turning monster hunts on...")
                        ENABLE_MONSTERHUNTS = true
                    } else if ((ENABLE_MONSTERHUNTS && args[1] == "off") || args[1] == "false") {
                        console.log("Turning monster hunts off...")
                        ENABLE_MONSTERHUNTS = false
                    }
                    break
                case "server":
                    if (args[1] && args[2]) {
                        OVERRIDE_REGION = args[1].toUpperCase() as ServerRegion
                        OVERRIDE_IDENTIFIER = args[2].toUpperCase() as ServerIdentifier
                        console.log(`Overriding server to ${OVERRIDE_REGION} ${OVERRIDE_IDENTIFIER}`)
                    } else {
                        OVERRIDE_REGION = undefined
                        OVERRIDE_IDENTIFIER = undefined
                        console.log("Clearing server override...")
                    }
                    break
            }
        }
        bot.socket.on("code_eval", this.onCodeEval)
    }

    public onRemove(bot: PingCompensatedCharacter) {
        if (this.onCodeEval) bot.socket.removeListener("code_eval", this.onCodeEval)
    }
}
const overrideStrategy = new OverrideStrategy()
class AdminCommandStrategy implements Strategy<PingCompensatedCharacter> {
    private onCodeEval: (data: string) => Promise<void>

    public constructor() {
        process.on("SIGINT", this.saveAndExit)
    }

    public onApply(bot: PingCompensatedCharacter) {
        this.onCodeEval = async (data: string) => {
            const args = data.split(" ")
            switch (args[0].toLowerCase()) {
                case "restart": {
                    // Save all the public contexts that are running
                    this.saveAndExit()
                    break
                }
                case "stop":
                    for (let i = 1; i < args.length; i++) {
                        const name = args[i]
                        if (PARTY_ALLOWLIST.includes(name)) {
                            // Don't allow them to party with us anymore
                            PARTY_ALLOWLIST.splice(PARTY_ALLOWLIST.indexOf(name), 1)
                        }

                        for (const context of filterContexts(PUBLIC_CONTEXTS)) {
                            if (context.bot.name === name) {
                                // Stop the context
                                stopPublicContext(bot.characterID).catch(console.error)
                                break
                            }
                        }
                    }
                    break
            }
        }
        bot.socket.on("code_eval", this.onCodeEval)
    }

    public onRemove(bot: PingCompensatedCharacter) {
        if (this.onCodeEval) bot.socket.removeListener("code_eval", this.onCodeEval)
    }

    protected saveAndExit() {
        const publicData = filterContexts(PUBLIC_CONTEXTS).reduce((acc: string, c) => {
            c.bot.characterID
            const row = PUBLIC_FIELDS.map((field) => c.bot[field]).join("🔥")
            return acc + row + "🔥" + JSON.stringify(SETTINGS_CACHE[c.bot.id] ?? {}) + "\n"
        }, PUBLIC_FIELDS.join(",") + "\n")
        fs.writeFileSync(PUBLIC_CSV, publicData)

        // Stop the script
        process.exit(0)
    }
}
const adminCommandStrategy = new AdminCommandStrategy()

const currentSetups = new Map<
    Strategist<PingCompensatedCharacter>,
    { attack: Strategy<PingCompensatedCharacter>; move: Strategy<PingCompensatedCharacter> }
>()
const applySetups = async (contexts: Strategist<PingCompensatedCharacter>[], setups: Setups) => {
    // Setup a list of ready contexts
    const setupContexts = filterContexts(contexts)
    if (setupContexts.length == 0) return

    const isDoable = (config: Config): Strategist<PingCompensatedCharacter>[] | false => {
        const tempContexts = [...setupContexts]
        const doableWith: Strategist<PingCompensatedCharacter>[] = []
        nextConfigCharacter: for (const characterConfig of config.characters) {
            nextContext: for (let i = 0; i < tempContexts.length; i++) {
                const context = tempContexts[i]
                if (context.bot.ctype !== characterConfig.ctype) continue // Wrong character type
                if (characterConfig.require) {
                    // Check level
                    if (characterConfig.require.level && context.bot.level < characterConfig.require.level)
                        continue nextContext // Not high enough level

                    // Check attributes
                    for (const a in characterConfig.require) {
                        if (a === "items") continue
                        const attribute = a as Attribute
                        if (context.bot[attribute] < characterConfig.require[attribute]) continue nextContext // Character doesn't meet requirement
                    }

                    // Check items
                    for (const itemName of characterConfig.require.items ?? []) {
                        if (!(context.bot.isEquipped(itemName) || context.bot.hasItem(itemName))) continue nextContext // Character doesn't have required item
                    }
                }

                doableWith.push(context)
                tempContexts.splice(i, 1)
                continue nextConfigCharacter // We found a character that works with this setup
            }
            return false // Not doable
        }
        return doableWith
    }

    const applyConfig = (config: Config): boolean => {
        const doableWith = isDoable(config)
        if (!doableWith) return false // Not doable
        nextConfig: for (const characterConfig of config.characters) {
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
                    doableWith.splice(doableWith.indexOf(context), 1)
                    setupContexts.splice(setupContexts.indexOf(context), 1)
                    continue nextConfig
                }
            }
        }
        return true
    }

    // Priority of targets
    const priority: MonsterName[] = []

    if (ENABLE_EVENTS) {
        for (const context of contexts) {
            // Goobrawl
            if (
                // Can join
                (context.bot.S.goobrawl && !context.bot.s.hopsickness && !context.bot.map.startsWith("bank")) ||
                // Already there
                (context.bot.map == "goobrawl" && context.bot.getEntity({ typeList: ["rgoo", "bgoo"] }))
            ) {
                priority.push("rgoo")
            }

            // Lunar New Year
            if (context.bot.S.lunarnewyear) {
                if ((context.bot.S.dragold as ServerInfoDataLive)?.live) priority.push("dragold")
                if (
                    (context.bot.S.tiger as ServerInfoDataLive)?.live &&
                    context.bot.serverData.name == DEFAULT_IDENTIFIER &&
                    context.bot.serverData.region == DEFAULT_REGION
                )
                    priority.push("tiger")
            }

            // Valentines
            if (context.bot.S.valentines) {
                if ((context.bot.S.pinkgoo as ServerInfoDataLive)?.live) priority.push("pinkgoo")
            }

            // Easter
            if (context.bot.S.egghunt) {
                if (
                    (context.bot.S.wabbit as ServerInfoDataLive)?.live &&
                    context.bot.serverData.name == DEFAULT_IDENTIFIER &&
                    context.bot.serverData.region == DEFAULT_REGION
                )
                    priority.push("wabbit")
            }

            // Halloween
            if (context.bot.S.halloween) {
                if ((context.bot.S.mrgreen as ServerInfoDataLive)?.live) {
                    if ((context.bot.S.mrpumpkin as ServerInfoDataLive)?.live) {
                        // Both are alive, target the lower hp one
                        if (
                            (context.bot.S.mrgreen as ServerInfoDataLive).hp >
                            (context.bot.S.mrpumpkin as ServerInfoDataLive).hp
                        ) {
                            priority.push("mrpumpkin")
                        } else {
                            priority.push("mrgreen")
                        }
                    } else {
                        // Only mrgreen is alive
                        priority.push("mrgreen")
                    }
                } else if ((context.bot.S.mrpumpkin as ServerInfoDataLive)?.live) {
                    // Only mrpumpkin is alive
                    priority.push("mrpumpkin")
                }
            }

            // Christmas
            if (context.bot.S.holidayseason) {
                if ((context.bot.S.grinch as ServerInfoDataLive)?.live) priority.push("grinch")
            }

            // Franky
            if (context.bot.S.franky) {
                if ((context.bot.S.franky as ServerInfoDataLive)?.live) priority.push("franky")
            }

            // Ice Golem
            if (context.bot.S.icegolem) {
                if ((context.bot.S.icegolem as ServerInfoDataLive)?.live) priority.push("icegolem")
            }

            // Giant Crab
            if (context.bot.S.crabxx) {
                if ((context.bot.S.crabxx as ServerInfoDataLive)?.live) priority.push("crabxx")
            }

            // Snowman
            if ((context.bot.S.snowman as ServerInfoDataLive)?.live) {
                const snowman = context.bot.getEntity({ type: "snowman" })
                if (snowman) {
                    if (snowman.s.fullguard || snowman.s.fullguardx) {
                        // Snowman isn't taking damage yet, farm bees
                        priority.push("arcticbee")
                    } else {
                        // Snowman is taking damage
                        priority.push("snowman")
                    }
                } else {
                    // No snowman nearby, go to snowman
                    priority.push("snowman")
                }
            }
        }
    }

    if (ENABLE_SPECIAL_MONSTERS) {
        for (const context of contexts) {
            for (const specialMonster of context.bot.getEntities({
                couldGiveCredit: true,
                typeList: SPECIAL_MONSTERS,
            })) {
                if (specialMonster.s?.fullguard?.ms > 30000 || specialMonster.s?.fullguardx?.ms > 30000) {
                    // Can't damage for another 30s
                    continue
                }
                for (const _context of contexts) {
                    priority.push(specialMonster.type)
                }
            }

            for (const type of await getRecentSpecialMonsters(
                PARTY_ALLOWLIST,
                SPECIAL_MONSTERS,
                context.bot.serverData.name,
                context.bot.serverData.region,
            )) {
                priority.push(type)
            }

            for (const xmage of context.bot.getEntities({
                couldGiveCredit: true,
                typeList: XMAGE_MONSTERS,
            })) {
                for (const _context of contexts) {
                    priority.push(xmage.type)
                }
            }

            for (const type of await getRecentXMages(context.bot.serverData.name, context.bot.serverData.region)) {
                priority.push(type)
            }

            for (const cryptMonster of context.bot.getEntities({
                couldGiveCredit: true,
                typeList: CRYPT_MONSTERS,
            })) {
                for (const _context of contexts) {
                    priority.push(cryptMonster.type)
                }
            }

            for (const type of await getRecentCryptMonsters(
                context.bot.serverData.name,
                context.bot.serverData.region,
            )) {
                priority.push(type)
            }
        }
    }

    // Monster override
    if (OVERRIDE_MONSTERS) {
        for (const _context of contexts) {
            priority.push(...OVERRIDE_MONSTERS)
        }
    }

    if (ENABLE_MONSTERHUNTS && TARGET_REGION == DEFAULT_REGION && TARGET_IDENTIFIER == DEFAULT_IDENTIFIER) {
        for (const _context of contexts) {
            for (const contexts2 of [PRIVATE_CONTEXTS, PUBLIC_CONTEXTS]) {
                const monsterhunts: {
                    ms: number
                    id: MonsterName
                }[] = []
                for (const context2 of contexts2) {
                    if (!context2.isReady()) continue
                    const bot2 = context2.bot
                    if (!bot2.s.monsterhunt || bot2.s.monsterhunt.c == 0) continue
                    monsterhunts.push(bot2.s.monsterhunt)
                }

                monsterhunts.sort((a, b) => a.ms - b.ms) // Lower time remaining first

                for (const monsterhunt of monsterhunts) {
                    priority.push(monsterhunt.id)
                }
            }
        }
    }

    // Default targets
    for (const _context of contexts) {
        priority.push(...DEFAULT_MONSTERS)
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

        if (ENABLE_SERVER_HOPS) {
            // Default
            TARGET_REGION = DEFAULT_REGION
            TARGET_IDENTIFIER = DEFAULT_IDENTIFIER

            if (bot1.S.lunarnewyear) {
                // Lunar New Year
                const monster = (await getLunarNewYearMonsterPriority())[0]
                if (monster) {
                    // We want to switch servers
                    TARGET_IDENTIFIER = monster.serverIdentifier
                    TARGET_REGION = monster.serverRegion
                }
            }

            if (
                // Valentines event can overlap with lunar new year
                TARGET_REGION == DEFAULT_REGION &&
                TARGET_IDENTIFIER == DEFAULT_IDENTIFIER &&
                bot1.S.valentines
            ) {
                // Valentines
                const monster = (await getValentinesMonsterPriority(true))[0]
                if (monster) {
                    // We want to switch servers
                    TARGET_IDENTIFIER = monster.serverIdentifier
                    TARGET_REGION = monster.serverRegion
                }
            } else if (bot1.S.halloween) {
                // Halloween
                const monster = (await getHalloweenMonsterPriority(true))[0]
                if (monster) {
                    // We want to switch servers
                    TARGET_IDENTIFIER = monster.serverIdentifier
                    TARGET_REGION = monster.serverRegion
                }
            } else if (bot1.S.holidayseason) {
                // Christmas
                // NOTE: We're going on PVP as of 2023-12-16
                const monster = (await getHolidaySeasonMonsterPriority(false))[0]
                if (monster) {
                    // We want to switch servers
                    TARGET_IDENTIFIER = monster.serverIdentifier
                    TARGET_REGION = monster.serverRegion
                }
            }

            // Other servers
            if (TARGET_REGION == DEFAULT_REGION && TARGET_IDENTIFIER == DEFAULT_IDENTIFIER) {
                const monster = (await getServerHopMonsterPriority(true))[0]
                if (monster) {
                    // We want to switch servers
                    TARGET_IDENTIFIER = monster.serverIdentifier
                    TARGET_REGION = monster.serverRegion
                }
            }

            // Goobrawl
            if (bot1.S.goobrawl && !bot1.s?.hopsickness) {
                // Goobrawl is active, stay on the current server
                TARGET_IDENTIFIER = bot1.serverData.name
                TARGET_REGION = bot1.serverData.region
            }
        }

        // Override
        if (OVERRIDE_REGION && OVERRIDE_IDENTIFIER) {
            TARGET_REGION = OVERRIDE_REGION
            TARGET_IDENTIFIER = OVERRIDE_IDENTIFIER
        }

        for (const context of contexts) {
            if (!context.isReady()) continue
            const bot = context.bot

            if (
                context.uptime() > 60_000 &&
                (bot.serverData.region !== TARGET_REGION || bot.serverData.name !== TARGET_IDENTIFIER)
            ) {
                await sleep(1000)
                console.log(
                    bot.id,
                    "is changing server from",
                    bot.serverData.region,
                    bot.serverData.name,
                    "to",
                    TARGET_REGION,
                    TARGET_IDENTIFIER,
                )
                for (const [id] of bot.chests) await bot.openChest(id).catch(console.error)
                context.changeServer(TARGET_REGION, TARGET_IDENTIFIER).catch(console.error)
                continue
            }

            if (bot.ctype == "merchant") continue

            if (
                ENABLE_MONSTERHUNTS &&
                // Only monsterhunt on our default server
                bot.serverData.region == DEFAULT_REGION &&
                bot.serverData.name == DEFAULT_IDENTIFIER
            ) {
                if (
                    !bot.s.monsterhunt && // We don't have a monster hunt
                    bot.map === bot.in // We aren't in an instance
                ) {
                    // Get a new monster hunt
                    removeSetup(context)
                    context.applyStrategy(getMonsterHuntStrategy)
                    continue
                }

                if (bot.s.monsterhunt?.c == 0) {
                    // Turn in our monster hunt
                    const [region, id] = bot.s.monsterhunt.sn.split(" ") as [ServerRegion, ServerIdentifier]
                    if (region == bot.serverData.region && id == bot.serverData.name) {
                        removeSetup(context)
                        context.applyStrategy(finishMonsterHuntStrategy)
                        continue
                    }
                }
            }

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
contextsLogic(PUBLIC_CONTEXTS, publicSetups)

// Shared setup
async function startShared(context: Strategist<PingCompensatedCharacter>, privateContext = false) {
    context.applyStrategy(debugStrategy)
    context.applyStrategy(guiStrategy)
    context.applyStrategy(partyAcceptStrategy)
    if (context.bot.id !== PARTY_LEADER) {
        context.applyStrategy(partyRequestStrategy)
    }

    if (privateContext) {
        context.applyStrategy(adminCommandStrategy)
        context.applyStrategy(overrideStrategy)
        context.applyStrategy(privateBuyStrategy)
        context.applyStrategy(privateSellStrategy)
        context.applyStrategy(privateItemStrategy)
    }

    context.applyStrategy(homeServerStrategy)
    context.applyStrategy(avoidDeathStrategy)
    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(elixirStrategy)
    context.applyStrategy(destroyStrategy)
    context.applyStrategy(upgradeStatisticsStrategy)
}

async function startMage(context: Strategist<Mage>, privateContext = false) {
    startShared(context, privateContext)
    context.applyStrategy(magiportStrategy)
    context.applyStrategy(magiportServiceStrategy)
}

async function startPaladin(context: Strategist<Paladin>, privateContext = false) {
    startShared(context, privateContext)
}

async function startPriest(context: Strategist<Priest>, privateContext = false) {
    startShared(context, privateContext)
    if (privateContext) {
        context.applyStrategy(privatePartyHealStrategy)
    } else {
        context.applyStrategy(publicPartyHealStrategy)
    }
}

async function startRanger(context: Strategist<Ranger>, privateContext = false) {
    startShared(context, privateContext)
}

async function startRogue(context: Strategist<Rogue>, privateContext = false) {
    startShared(context, privateContext)
    context.applyStrategy(rspeedStrategy)
}

// Warrior setup
async function startWarrior(context: Strategist<Warrior>, privateContext = false) {
    context.applyStrategy(chargeStrategy)
    startShared(context, privateContext)
}

// Start my characters
const startMerchantContext = async () => {
    let merchant: Merchant
    try {
        merchant = await AL.Game.startMerchant(MERCHANT, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (merchant) merchant.disconnect()
        console.error(e)
        setTimeout(startMerchantContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Merchant>(merchant, baseStrategy)
    startMerchant(CONTEXT, PRIVATE_CONTEXTS, {
        ...defaultNewMerchantStrategyOptions,
        goldToHold: 500_000_000,
        // enableInstanceProvider: {
        //     crypt: {
        //         maxInstances: 5,
        //     },
        //     winter_instance: {
        //         maxInstances: 1,
        //     },
        // },
    })
    CONTEXT.applyStrategy(adminCommandStrategy)
    CONTEXT.applyStrategy(guiStrategy)
    CONTEXT.applyStrategy(privateSellStrategy)
    CONTEXT.applyStrategy(privateItemStrategy)
    CONTEXT.applyStrategy(merchantDestroyStrategy)
    CONTEXT.applyStrategy(avoidDeathStrategy)
    CONTEXT.applyStrategy(privateBuyStrategy)
    CONTEXT.applyStrategy(upgradeStatisticsStrategy)

    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
startMerchantContext()

const startWarriorContext = async (name: string) => {
    let warrior: Warrior
    try {
        warrior = await AL.Game.startWarrior(name, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (warrior) warrior.disconnect()
        console.error(e)
        setTimeout(startWarriorContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Warrior>(warrior, baseStrategy)
    startWarrior(CONTEXT, true).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
for (const name of WARRIORS) startWarriorContext(name)

const startMageContext = async (name: string) => {
    let mage: Mage
    try {
        mage = await AL.Game.startMage(name, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (mage) mage.disconnect()
        console.error(e)
        setTimeout(startMageContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Mage>(mage, baseStrategy)
    startMage(CONTEXT, true).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
for (const name of MAGES) startMageContext(name)

const startPaladinContext = async (name: string) => {
    let paladin: Paladin
    try {
        paladin = await AL.Game.startPaladin(name, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (paladin) paladin.disconnect()
        console.error(e)
        setTimeout(startPaladinContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Paladin>(paladin, baseStrategy)
    startPaladin(CONTEXT, true).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
for (const name of PALADINS) startPaladinContext(name)

const startPriestContext = async (name: string) => {
    let priest: Priest
    try {
        priest = await AL.Game.startPriest(name, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (priest) priest.disconnect()
        console.error(e)
        setTimeout(startPriestContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Priest>(priest, baseStrategy)
    startPriest(CONTEXT, true).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
for (const name of PRIESTS) startPriestContext(name)

const startRangerContext = async (name: string) => {
    let ranger: Ranger
    try {
        ranger = await AL.Game.startRanger(name, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (ranger) ranger.disconnect()
        console.error(e)
        setTimeout(startRangerContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Ranger>(ranger, baseStrategy)
    startRanger(CONTEXT, true).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
for (const name of RANGERS) startRangerContext(name)

const startRogueContext = async (name: string) => {
    let rogue: Rogue
    try {
        rogue = await AL.Game.startRogue(name, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (rogue) rogue.disconnect()
        console.error(e)
        setTimeout(startRogueContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Rogue>(rogue, baseStrategy)
    startRogue(CONTEXT, true).catch(console.error)
    PRIVATE_CONTEXTS.push(CONTEXT)
    ALL_CONTEXTS.push(CONTEXT)
}
for (const name of ROGUES) startRogueContext(name)

class DisconnectOnCommandStrategy implements Strategy<PingCompensatedCharacter> {
    private onCodeEval: (data: string) => Promise<void>

    public onApply(bot: PingCompensatedCharacter) {
        this.onCodeEval = async (data: string) => {
            data = data.toLowerCase()
            if (data == "stop" || data == "disconnect") {
                if (PARTY_ALLOWLIST.includes(bot.id)) {
                    // Don't allow them to party with us anymore
                    PARTY_ALLOWLIST.splice(PARTY_ALLOWLIST.indexOf(bot.id), 1)
                }
                stopPublicContext(bot.characterID).catch(console.error)
            }
        }

        bot.socket.on("code_eval", this.onCodeEval)
    }

    public onRemove(bot: PingCompensatedCharacter) {
        if (this.onCodeEval) bot.socket.removeListener("code_eval", this.onCodeEval)
    }
}
const disconnectOnCommandStrategy = new DisconnectOnCommandStrategy()

export type PublicSettings = {
    itemConfig?: ItemConfig
    merchantConfig?: Partial<
        Pick<NewMerchantStrategyOptions, "defaultPosition" | "goldToHold" | "enableInstanceProvider">
    >
}

// Allow others to join me
const startPublicContext = async (
    type: CharacterType,
    userID: string,
    userAuth: string,
    characterID: string,
    settings: PublicSettings = {},
    attemptNum = 0,
) => {
    if (settings.itemConfig) {
        await runSanityCheckOnItemConfig(settings.itemConfig)
    }

    // Remove stopped contexts
    for (let i = 0; i < ALL_CONTEXTS.length; i++) {
        const context = ALL_CONTEXTS[i]
        if (context.isStopped() && context.bot.characterID) {
            await stopPublicContext(context.bot.characterID)
            i -= 1
        }
    }

    // Checks
    if (type == "merchant") {
        for (const context of PUBLIC_CONTEXTS) {
            const character = context.bot
            if (character.owner == characterID)
                throw `There is a merchant with the ID '${characterID}' (${character.id}) already running. You can only run one merchant.`
        }
    } else {
        let numChars = 0
        for (const context of PUBLIC_CONTEXTS) {
            const character = context.bot
            if (character.ctype == "merchant") continue // Merchants don't count
            numChars++
        }
        if (numChars >= MAX_PUBLIC_CHARACTERS)
            throw `Too many characters are already running (We only support ${MAX_PUBLIC_CHARACTERS} characters simultaneously)`
        for (const context of PUBLIC_CONTEXTS) {
            const character = context.bot
            if (character.characterID == characterID)
                throw `There is a character with the ID '${characterID}' (${character.id}) already running. Stop the character first to change its settings.`
        }
    }

    let bot: PingCompensatedCharacter
    try {
        switch (type) {
            case "mage": {
                bot = new AL.Mage(
                    userID,
                    userAuth,
                    characterID,
                    AL.Game.G,
                    AL.Game.servers[TARGET_REGION][TARGET_IDENTIFIER],
                )
                break
            }
            case "merchant": {
                bot = new AL.Merchant(
                    userID,
                    userAuth,
                    characterID,
                    AL.Game.G,
                    AL.Game.servers[TARGET_REGION][TARGET_IDENTIFIER],
                )
                break
            }
            case "paladin": {
                bot = new AL.Paladin(
                    userID,
                    userAuth,
                    characterID,
                    AL.Game.G,
                    AL.Game.servers[TARGET_REGION][TARGET_IDENTIFIER],
                )
                break
            }
            case "priest": {
                bot = new AL.Priest(
                    userID,
                    userAuth,
                    characterID,
                    AL.Game.G,
                    AL.Game.servers[TARGET_REGION][TARGET_IDENTIFIER],
                )
                break
            }
            case "ranger": {
                bot = new AL.Ranger(
                    userID,
                    userAuth,
                    characterID,
                    AL.Game.G,
                    AL.Game.servers[TARGET_REGION][TARGET_IDENTIFIER],
                )
                break
            }
            case "rogue": {
                bot = new AL.Rogue(
                    userID,
                    userAuth,
                    characterID,
                    AL.Game.G,
                    AL.Game.servers[TARGET_REGION][TARGET_IDENTIFIER],
                )
                break
            }
            case "warrior": {
                bot = new AL.Warrior(
                    userID,
                    userAuth,
                    characterID,
                    AL.Game.G,
                    AL.Game.servers[TARGET_REGION][TARGET_IDENTIFIER],
                )
                break
            }
        }
        await bot.connect()
    } catch (e) {
        if (bot) bot.disconnect()
        console.error(e)
        if (/nouser/.test(e)) {
            throw new Error(`Authorization failed for ${characterID}! No longer trying to connect...`)
        }
        attemptNum += 1
        if (attemptNum < 2) {
            setTimeout(startPublicContext, 10_000, type, userID, userAuth, characterID, settings, attemptNum)
        } else {
            throw new Error(`Failed starting ${characterID}! No longer trying to connect...`)
        }
        return
    }
    let context: Strategist<PingCompensatedCharacter>
    switch (type) {
        case "mage": {
            context = new Strategist<Mage>(bot as Mage, baseStrategy)
            startMage(context as Strategist<Mage>).catch(console.error)
            break
        }
        case "merchant": {
            context = new Strategist<Merchant>(bot as Merchant, baseStrategy)
            const merchantOptions: NewMerchantStrategyOptions = {
                contexts: PUBLIC_CONTEXTS,
                defaultPosition: {
                    map: "main",
                    x: randomIntFromInterval(-50, 50),
                    y: randomIntFromInterval(-50, 50),
                },
                goldToHold: 50_000_000,
                itemConfig: settings?.itemConfig ?? REPLENISH_ITEM_CONFIG,
            }
            if (context.bot.canUse("mluck", { ignoreCooldown: true, ignoreLocation: true, ignoreMP: true })) {
                merchantOptions.enableMluck = {
                    contexts: true,
                    self: true,
                    travel: true,
                }
            }
            startMerchant(context as Strategist<Merchant>, PUBLIC_CONTEXTS, merchantOptions)
            context.applyStrategy(guiStrategy)
            break
        }
        case "paladin": {
            context = new Strategist<Paladin>(bot as Paladin, baseStrategy)
            startPaladin(context as Strategist<Paladin>).catch(console.error)
            break
        }
        case "priest": {
            context = new Strategist<Priest>(bot as Priest, baseStrategy)
            startPriest(context as Strategist<Priest>).catch(console.error)
            break
        }
        case "ranger": {
            context = new Strategist<Ranger>(bot as Ranger, baseStrategy)
            startRanger(context as Strategist<Ranger>).catch(console.error)
            break
        }
        case "rogue": {
            context = new Strategist<Rogue>(bot as Rogue, baseStrategy)
            startRogue(context as Strategist<Rogue>).catch(console.error)
            break
        }
        case "warrior": {
            context = new Strategist<Warrior>(bot as Warrior, baseStrategy)
            startWarrior(context as Strategist<Warrior>).catch(console.error)
            break
        }
    }
    if (PARTY_ALLOWLIST.indexOf(bot.id) < 0) PARTY_ALLOWLIST.push(bot.id)
    context.applyStrategy(disconnectOnCommandStrategy)

    context.applyStrategy(new SellStrategy({ itemConfig: settings.itemConfig ?? REPLENISH_ITEM_CONFIG }))
    context.applyStrategy(
        new ItemStrategy({ contexts: PUBLIC_CONTEXTS, itemConfig: settings.itemConfig ?? REPLENISH_ITEM_CONFIG }),
    )
    context.applyStrategy(
        new BuyStrategy({ contexts: PUBLIC_CONTEXTS, itemConfig: settings.itemConfig ?? REPLENISH_ITEM_CONFIG }),
    )

    SETTINGS_CACHE[bot.id] = settings
    PUBLIC_CONTEXTS.push(context)
    ALL_CONTEXTS.push(context)
}

// Load players from the public csv if one exists
if (fs.existsSync(PUBLIC_CSV)) {
    const lines = fs.readFileSync(PUBLIC_CSV, "utf-8").split("\n")

    // Remove the first line of the CSV (headers)
    lines.shift()

    for (const line of lines) {
        const data = line.split("🔥")
        if (!data[0]) continue // empty line
        await startPublicContext(
            data[0] as CharacterType,
            data[1],
            data[2],
            data[3],
            JSON.parse(data[4] ?? "{}"),
        ).catch(console.error)
    }

    // Delete the file after we load the players in
    fs.unlinkSync(PUBLIC_CSV)
}

async function stopPublicContext(characterID: string) {
    let context: Strategist<PingCompensatedCharacter>
    for (const find of PUBLIC_CONTEXTS) {
        if (find.bot.characterID !== characterID) continue
        context = find
        break
    }

    const publicIndex = PUBLIC_CONTEXTS.indexOf(context)
    const allIndex = ALL_CONTEXTS.indexOf(context)

    context.stop()
    PUBLIC_CONTEXTS.splice(publicIndex, 1)
    ALL_CONTEXTS.splice(allIndex, 1)
}

const app = express()
app.use(express.json())
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
const port = 80

app.get("/", (_req, res) => {
    res.sendFile(path.join(path.resolve(), "/earthiverse.html"))
})

app.post(
    "/",
    body("user").trim().isLength({ max: 16, min: 16 }).withMessage("User IDs are exactly 16 digits."),
    body("user").trim().isNumeric().withMessage("User IDs are numeric."),
    body("auth").trim().isLength({ max: 21, min: 21 }).withMessage("Auth codes are exactly 21 characters."),
    body("auth").trim().isAlphanumeric("en-US", { ignore: /\s/ }).withMessage("Auth codes are alphanumeric."),
    body("char").trim().isLength({ max: 16, min: 16 }).withMessage("Character IDs are exactly 16 digits."),
    body("char").trim().isNumeric().withMessage("Character IDs are numeric."),
    body("char_type")
        .trim()
        .matches(/\b(?:mage|merchant|paladin|priest|ranger|rogue|warrior)\b/)
        .withMessage("Character type not supported."),
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        try {
            const charType = req.body.char_type.trim()
            const userID = req.body.user.trim()
            const userAuth = req.body.auth.trim()
            const characterID = req.body.char.trim()
            const settings = req.body.settings ? JSON.parse(req.body.settings) : {}

            await startPublicContext(charType, userID, userAuth, characterID, settings)
            return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
        } catch (e) {
            console.error(e)
            return res.status(500).send(e)
        }
    },
)

app.listen(port, async () => {
    console.log(`Ready on port ${port}!`)
})
