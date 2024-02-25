import AL, {
    Merchant,
    PingCompensatedCharacter,
    Priest,
    Mage,
    Warrior,
    ServerRegion,
    ServerIdentifier,
    MonsterName,
    ServerInfoDataLive,
    Paladin,
    Ranger,
    Rogue,
    Attribute,
} from "alclient"
import {
    DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS,
    startMerchant,
} from "./merchant/strategy.js"
import { filterContexts, Strategist, Strategy } from "./strategy_pattern/context.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import {
    FinishMonsterHuntStrategy,
    GetHolidaySpiritStrategy,
    GetMonsterHuntStrategy,
} from "./strategy_pattern/strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir.js"
import { PartyHealStrategy } from "./strategy_pattern/strategies/partyheal.js"
import { Config, constructSetups, Setups } from "./strategy_pattern/setups/base.js"
import { DebugStrategy } from "./strategy_pattern/strategies/debug.js"
import { NewSellStrategy } from "./strategy_pattern/strategies/sell.js"
import { MagiportOthersSmartMovingToUsStrategy } from "./strategy_pattern/strategies/magiport.js"
import { DEFAULT_IDENTIFIER, DEFAULT_ITEMS_TO_HOLD, DEFAULT_REGION } from "./base/defaults.js"
import { ChargeStrategy } from "./strategy_pattern/strategies/charge.js"
import { ItemStrategy } from "./strategy_pattern/strategies/item.js"
import { AvoidStackingStrategy } from "./strategy_pattern/strategies/avoid_stacking.js"
import { GiveRogueSpeedStrategy } from "./strategy_pattern/strategies/rspeed.js"
import { HomeServerStrategy } from "./strategy_pattern/strategies/home_server.js"
import { AvoidDeathStrategy } from "./strategy_pattern/strategies/avoid_death.js"
import { BEE_DUNGEON_MONSTERS } from "./strategy_pattern/setups/beedungeon.js"
import { DEFAULT_ITEM_CONFIG } from "./base/itemsNew.js"

AL.Game.setServer("http://thmsn.adventureland.community")

await Promise.all([AL.Game.loginJSONFile("../credentials.thmsn.json", false), AL.Game.getGData(false)])
await AL.Pathfinder.prepare(AL.Game.G, { remove_abtesting: true, remove_test: true })
await AL.Game.updateServersAndCharacters()

//// ALClient Hacks
// Hack to add bee_queen as a special monster
AL.Constants.SPECIAL_MONSTERS.push(...BEE_DUNGEON_MONSTERS)

//// Game Hacks
// Hack to fix URLs
for (const region in AL.Game.servers) {
    for (const id in AL.Game.servers[region]) {
        console.debug(`before: ${AL.Game.servers[region][id].addr}`)
        AL.Game.servers[region][id].addr = 'thmsn.adventureland.community'
        console.debug(`after: ${AL.Game.servers[region][id].addr}`)
    }
}

// Toggles
const ENABLE_EVENTS = true
const ENABLE_SPECIAL_MONSTERS = true
let ENABLE_MONSTERHUNTS = true
const DEFAULT_MONSTERS: MonsterName[] = ["bee"]
const SPECIAL_MONSTERS: MonsterName[] = [
    "cutebee",
    ...BEE_DUNGEON_MONSTERS,
    "fvampire",
    "goldenbat",
    "greenjr",
    "jr",
    "mvampire",
    // "skeletor",
    "snowman",
    // "stompy",
    "tinyp",
    "wabbit",
]

const MERCHANT = "earthMer"
const RANGER = "earthiverse"
const MAGE = "earthMag"
const PRIEST = "earthPri"

const PARTY_LEADER = RANGER
const PARTY_ALLOWLIST = ["earthiverse", "earthMag", "earthPri", "earthWar"]

let TARGET_REGION: ServerRegion = DEFAULT_REGION
let TARGET_IDENTIFIER: ServerIdentifier = DEFAULT_IDENTIFIER

/** My characters */
const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const baseStrategy = new BaseStrategy(CONTEXTS)
const privateBuyStrategy = new BuyStrategy({
    contexts: CONTEXTS,
    itemConfig: DEFAULT_ITEM_CONFIG
})

const privateSellStrategy = new NewSellStrategy({
    itemConfig: DEFAULT_ITEM_CONFIG
})

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
const magiportStrategy = new MagiportOthersSmartMovingToUsStrategy(CONTEXTS)
// Priest
const privatePartyHealStrategy = new PartyHealStrategy(CONTEXTS)
const trackerStrategy = new TrackerStrategy()
const respawnStrategy = new RespawnStrategy()
// Rogue
const rspeedStrategy = new GiveRogueSpeedStrategy()
// Warrior
const chargeStrategy = new ChargeStrategy()
// Setups
const privateSetups = constructSetups(CONTEXTS)
const elixirStrategy = new ElixirStrategy("elixirluck")
const homeServerStrategy = new HomeServerStrategy(DEFAULT_REGION, DEFAULT_IDENTIFIER)
const privateItemStrategy = new ItemStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })

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
        process.on("SIGINT", this.exit)
    }

    public onApply(bot: PingCompensatedCharacter) {
        this.onCodeEval = async (data: string) => {
            const args = data.split(" ")
            switch (args[0].toLowerCase()) {
                case "restart": {
                    this.exit()
                    break
                }
            }
        }
        bot.socket.on("code_eval", this.onCodeEval)
    }

    public onRemove(bot: PingCompensatedCharacter) {
        if (this.onCodeEval) bot.socket.removeListener("code_eval", this.onCodeEval)
    }

    protected exit() {
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
                if (
                    (context.bot.S.pinkgoo as ServerInfoDataLive)?.live &&
                    context.bot.serverData.name == DEFAULT_IDENTIFIER &&
                    context.bot.serverData.region == DEFAULT_REGION
                )
                    priority.push("pinkgoo")
            }

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
                priority.push(specialMonster.type)
            }

            if (AL.Database.connection) {
                for (const specialMonster of await AL.EntityModel.find(
                    {
                        $and: [
                            {
                                $or: [
                                    { target: undefined },
                                    { target: { $in: PARTY_ALLOWLIST } },
                                    { type: { $in: ["phoenix", "snowman", "wabbit"] } }, // Coop monsters will give credit
                                ],
                            },
                            {
                                $or: [{ "s.fullguardx": undefined }, { "s.fullguardx.ms": { $lt: 30_000 } }],
                            },
                            {
                                $or: [{ "s.fullguard": undefined }, { "s.fullguard.ms": { $lt: 30_000 } }],
                            },
                        ],
                        lastSeen: { $gt: Date.now() - 30_000 },
                        serverIdentifier: context.bot.serverData.name,
                        serverRegion: context.bot.serverData.region,
                        type: { $in: SPECIAL_MONSTERS },
                    },
                    {
                        type: 1,
                    },
                )
                    .lean()
                    .exec()) {
                    priority.push(specialMonster.type)
                }
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
        const monsterhunts: {
            ms: number
            id: MonsterName
        }[] = []
        for (const _context of contexts) {
            if (!_context.isReady()) continue
            const bot2 = _context.bot
            if (!bot2.s.monsterhunt || bot2.s.monsterhunt.c == 0) continue
            monsterhunts.push(bot2.s.monsterhunt)
        }
        monsterhunts.sort((a, b) => a.ms - b.ms) // Lower time remaining first
        for (const _context of contexts) {
            for (const monsterhunt of monsterhunts) {
                priority.push(monsterhunt.id)
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

        for (const context of contexts) {
            if (!context.isReady()) continue
            const bot = context.bot

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
contextsLogic(CONTEXTS, privateSetups)

// Shared setup
async function startShared(context: Strategist<PingCompensatedCharacter>) {
    context.applyStrategy(debugStrategy)
    context.applyStrategy(partyAcceptStrategy)
    if (context.bot.id !== PARTY_LEADER) {
        context.applyStrategy(partyRequestStrategy)
    }

    context.applyStrategy(adminCommandStrategy)
    context.applyStrategy(overrideStrategy)
    context.applyStrategy(privateBuyStrategy)
    context.applyStrategy(privateSellStrategy)
    context.applyStrategy(privateItemStrategy)

    context.applyStrategy(homeServerStrategy)
    context.applyStrategy(avoidDeathStrategy)
    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(elixirStrategy)
}

async function startMage(context: Strategist<Mage>) {
    startShared(context)
    context.applyStrategy(magiportStrategy)
}

async function startPaladin(context: Strategist<Paladin>) {
    startShared(context)
}

async function startPriest(context: Strategist<Priest>) {
    startShared(context)
    context.applyStrategy(privatePartyHealStrategy)
}

async function startRanger(context: Strategist<Ranger>) {
    startShared(context)
}

async function startRogue(context: Strategist<Rogue>) {
    startShared(context)
    context.applyStrategy(rspeedStrategy)
}

// Warrior setup
async function startWarrior(context: Strategist<Warrior>) {
    context.applyStrategy(chargeStrategy)
    startShared(context)
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
    startMerchant(CONTEXT, CONTEXTS, {
        ...DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS,
        debug: true,
        enableOffload: {
            esize: 20,
            goldToHold: 100_000,
            itemsToHold: DEFAULT_ITEMS_TO_HOLD,
        },
        enableInstanceProvider: {
            "bee_dungeon": {
                maxInstances: 1
            }
        },
        defaultPosition: { map: "main", x: -250, y: -125 }
    })
    CONTEXT.applyStrategy(debugStrategy)
    CONTEXT.applyStrategy(adminCommandStrategy)
    CONTEXT.applyStrategy(privateSellStrategy)
    CONTEXT.applyStrategy(privateItemStrategy)
    CONTEXT.applyStrategy(avoidDeathStrategy)
    CONTEXTS.push(CONTEXT)
}
startMerchantContext()

// const startWarriorContext = async () => {
//     let warrior: Warrior
//     try {
//         warrior = await AL.Game.startWarrior(WARRIOR, TARGET_REGION, TARGET_IDENTIFIER)
//     } catch (e) {
//         if (warrior) warrior.disconnect()
//         console.error(e)
//         setTimeout(startWarriorContext, 10_000)
//         return
//     }
//     const CONTEXT = new Strategist<Warrior>(warrior, baseStrategy)
//     startWarrior(CONTEXT).catch(console.error)
//     CONTEXTS.push(CONTEXT)
//     ALL_CONTEXTS.push(CONTEXT)
// }
// startWarriorContext()

const startRangerContext = async () => {
    let ranger: Ranger
    try {
        ranger = await AL.Game.startRanger(RANGER, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (ranger) ranger.disconnect()
        console.error(e)
        setTimeout(startMageContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Ranger>(ranger, baseStrategy)
    startRanger(CONTEXT).catch(console.error)
    CONTEXTS.push(CONTEXT)
}
startRangerContext()

const startMageContext = async () => {
    let mage: Mage
    try {
        mage = await AL.Game.startMage(MAGE, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (mage) mage.disconnect()
        console.error(e)
        setTimeout(startMageContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Mage>(mage, baseStrategy)
    startMage(CONTEXT).catch(console.error)
    CONTEXTS.push(CONTEXT)
}
startMageContext()

const startPriestContext = async () => {
    let priest: Priest
    try {
        priest = await AL.Game.startPriest(PRIEST, TARGET_REGION, TARGET_IDENTIFIER)
    } catch (e) {
        if (priest) priest.disconnect()
        console.error(e)
        setTimeout(startPriestContext, 10_000)
        return
    }
    const CONTEXT = new Strategist<Priest>(priest, baseStrategy)
    startPriest(CONTEXT).catch(console.error)
    CONTEXTS.push(CONTEXT)
}
startPriestContext()