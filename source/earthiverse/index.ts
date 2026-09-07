import AL, {
    Attribute,
    EntityModel,
    IPosition,
    MonsterName,
    PingCompensatedCharacter,
    ServerIdentifier,
    ServerInfoDataLive,
    ServerRegion,
} from "alclient"
import { filterContexts, Strategist, Strategy } from "../strategy_pattern/context"
import { Config, constructSetups, Setups } from "../strategy_pattern/setups/base"
import { GiveRogueSpeedStrategy } from "../strategy_pattern/strategies/rspeed"
import { DEFAULT_ITEM_CONFIG } from "../base/itemsNew"
import { ItemStrategy } from "../strategy_pattern/strategies/item"
import { ElixirStrategy } from "../strategy_pattern/strategies/elixir"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party"
import { AvoidDeathStrategy } from "../strategy_pattern/strategies/avoid_death"
import { AvoidStackingStrategy } from "../strategy_pattern/strategies/avoid_stacking"
import { BaseStrategy } from "../strategy_pattern/strategies/base"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker"
import { MagiportOthersSmartMovingToUsStrategy } from "../strategy_pattern/strategies/magiport"
import { ChargeStrategy } from "../strategy_pattern/strategies/charge"
import { DestroyStrategy, MerchantDestroyStrategy } from "../strategy_pattern/strategies/destroy"
import { BuyStrategy } from "../strategy_pattern/strategies/buy"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn"
import { SellStrategy } from "../strategy_pattern/strategies/sell"
import { PartyHealStrategy } from "../strategy_pattern/strategies/partyheal"
import { BoosterStrategy } from "../strategy_pattern/strategies/booster"
import { ToggleStandStrategy } from "../strategy_pattern/strategies/stand"
import { defaultNewMerchantStrategyOptions, NewMerchantStrategy } from "../merchant/strategy"
import { HomeServerStrategy } from "../strategy_pattern/strategies/home_server"
import { TemporalSurgeBossesStrategy } from "../strategy_pattern/strategies/temporal"
import { FixStuffStrategy } from "../strategy_pattern/strategies/fixes"

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason)
})

await Promise.all([AL.Game.loginJSONFile("credentials.json", true), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: true, remove_abtesting: true, remove_test: true })

const DEFAULT_REGION: ServerRegion = "US"
const DEFAULT_IDENTIFIER: ServerIdentifier = "II"
const DEFAULT_MONSTERS: MonsterName[] = ["plantoid", "crab", "crab"]
const MONSTER_PRIORITY: MonsterName[] = [
    // Main bosses
    "crabxx",
    "franky",
    "icegolem",
    // Event bosses
    "dragold",
    "grinch",
    "mrgreen",
    "mrpumpkin",
    "wabbit",
    // Mini bosses
    "goldenbat",
    "cutebee",
    "stompy",
    "skeletor",
    "fvampire",
    "mvampire",
    "rharpy",
    "greenjr",
    "jr",
    "snowman",
]
const MERCHANT_HOLD_POSITION: IPosition = { map: "main", x: 0, y: 0 }

// TODO: Make strategies for event bosses for these character compositions
//       [mage, paladin, warrior]
//       [ranger, rogue, rogue]
//       [ranger, ranger, rogue]
const SETUPS: {
    [T in ServerRegion]?: {
        [T in Exclude<ServerIdentifier, "HARDCORE">]?: [string, string, string, string]
    }
} = {
    US: {
        I: ["earthMer", "earthMag2", "earthPri2", "earthWar2"],
        II: ["earthMer", "earthMag", "earthPri", "earthWar"],
        // III: ["earthMer", "earthPal", "earthMag3", "earthWar3"],
    },
    EU: {
        // I: ["earthMer", "earthRog", "earthiverse", "earthRog2"],
        // II: ["earthMer", "earthRog3", "earthRan2", "earthRan3"],
    },
}

const activeStrategists: Strategist<PingCompensatedCharacter>[] = []
let currentRegion: ServerRegion | undefined = undefined
let currentIdentifier: ServerIdentifier | undefined = undefined
let currentMonster: MonsterName | undefined = undefined

const MONSTER_SETUPS = constructSetups(activeStrategists)
const currentSetups = new Map<
    Strategist<PingCompensatedCharacter>,
    { attack: Strategy<PingCompensatedCharacter>; move: Strategy<PingCompensatedCharacter> }
>()

const removeSetup = (context: Strategist<PingCompensatedCharacter>) => {
    const current = currentSetups.get(context)

    if (current) {
        context.removeStrategy(current.attack)
        context.removeStrategy(current.move)
        currentSetups.delete(context)
    }
}

const applySetups = (
    contexts: Strategist<PingCompensatedCharacter>[],
    setups: Setups,
    priority: MonsterName[] = [],
) => {
    // Setup a list of ready contexts
    const setupContexts = filterContexts(contexts).filter((c) => c.bot.ctype !== "merchant")
    if (setupContexts.length === 0) return

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
                        if (a === "items" || a === "level") continue
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
                if (context.bot.ctype === characterConfig.ctype) {
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

    for (const id of priority) {
        if (setupContexts.length === 0) break // All set up
        const setup = setups[id]
        if (!setup) continue // No setup for current

        for (const config of setup.configs) {
            if (applyConfig(config)) {
                break // We found a config that works
            }
        }
    }
}

const ACCEPT_PARTY_REQUEST_STRATEGY = new AcceptPartyRequestStrategy()
const AVOID_DEATH_STRATEGY = new AvoidDeathStrategy()
const AVOID_STACKING_STRATEGY = new AvoidStackingStrategy()
const BASE_STRATEGY = new BaseStrategy(activeStrategists)
const BOOSTER_STRATEGY = new BoosterStrategy("luckbooster")
const BUY_STRATEGY = new BuyStrategy({
    contexts: activeStrategists,
    itemConfig: DEFAULT_ITEM_CONFIG,
    enableBuyForProfit: true,
})
const CHARGE_STRATEGY = new ChargeStrategy()
const DESTROY_STRATEGY = new DestroyStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const ELIXIR_STRATEGY = new ElixirStrategy("elixirluck")
const FIX_STUFF_STRATEGY = new FixStuffStrategy()
const GIVE_ROGUE_SPEED_STRATEGY = new GiveRogueSpeedStrategy()
const ITEM_STRATEGY = new ItemStrategy({
    contexts: activeStrategists,
    itemConfig: DEFAULT_ITEM_CONFIG,
    transferItemsTo: "earthMer",
})
const MAGIPORT_STRATEGY = new MagiportOthersSmartMovingToUsStrategy(activeStrategists)
const MERCHANT_DESTROY_STRATEGY = new MerchantDestroyStrategy()
const MERCHANT_STRATEGY = new NewMerchantStrategy({
    ...defaultNewMerchantStrategyOptions,
    contexts: activeStrategists,
    defaultPosition: MERCHANT_HOLD_POSITION,
    goldToHold: 1_000_000_000,
})
const PARTY_HEAL_STRATEGY = new PartyHealStrategy(activeStrategists)
const RESPAWN_STRATEGY = new RespawnStrategy()
const SELL_STRATEGY = new SellStrategy({
    itemConfig: DEFAULT_ITEM_CONFIG,
})
const TEMPORAL_STRATEGY = new TemporalSurgeBossesStrategy()
const TOGGLE_STAND_STRATEGY = new ToggleStandStrategy({
    offWhenMoving: true,
    onWhenNear: [{ distance: 10, position: MERCHANT_HOLD_POSITION }],
})
const TRACKER_STRATEGY = new TrackerStrategy()

const getNextTarget = async (): Promise<[ServerRegion, ServerIdentifier, MonsterName] | undefined> => {
    // Get monsters from the DB
    const liveMonsters = await EntityModel.find({
        type: { $in: MONSTER_PRIORITY },
        lastSeen: { $gt: Date.now() - 60_000 },
    })
        .lean()
        .exec()
    liveMonsters.sort((a, b) => {
        // Priority first
        const aPriority = MONSTER_PRIORITY.indexOf(a.type)
        const bPriority = MONSTER_PRIORITY.indexOf(b.type)
        if (aPriority !== bPriority) return aPriority - bPriority

        // HP (lower first)
        if (a.hp !== undefined && b.hp !== undefined) return a.hp - b.hp

        // Last seen (more recently seen first)
        return b.lastSeen - a.lastSeen
    })

    // TODO: Look for monsters in DB that are about to spawn

    for (const priorityType of MONSTER_PRIORITY) {
        // Look for monsters from the DB
        for (const liveMonster of liveMonsters) {
            if (!SETUPS[liveMonster.serverRegion]?.[liveMonster.serverIdentifier]) continue // No setup for this server
            if (liveMonster.type !== priorityType) continue
            return [liveMonster.serverRegion, liveMonster.serverIdentifier, priorityType]
        }

        // Look for monsters nearby our active characters
        for (const strategist of activeStrategists) {
            if (!strategist.isReady()) continue
            const priorityS = strategist.bot.S?.[priorityType]
            if (priorityS !== undefined && (priorityS as ServerInfoDataLive).live) {
                return [strategist.bot.server.region, strategist.bot.server.name, priorityType]
            }

            for (const entity of strategist.bot.entities.values()) {
                if (entity.type !== priorityType) continue
                return [strategist.bot.server.region, strategist.bot.server.name, priorityType]
            }
        }
    }

    // Return the default, we don't have anything specific to do
    return [DEFAULT_REGION, DEFAULT_IDENTIFIER, DEFAULT_MONSTERS[0]]
}

const managerLoop = async () => {
    const timeoutMs = 5_000
    try {
        const [nextRegion, nextIdentifier, nextMonster] = await getNextTarget()

        if (currentRegion !== nextRegion || currentIdentifier !== nextIdentifier) {
            const characterNames = SETUPS[nextRegion]?.[nextIdentifier] as [string, string, string, string]
            if (characterNames === undefined) throw new Error(`No setup found for ${nextRegion} ${nextIdentifier}`)

            const homeServerStrategy = new HomeServerStrategy(nextRegion, nextIdentifier)

            // Stop bots
            for (const strategist of activeStrategists) {
                removeSetup(strategist)
                for (const [id] of strategist.bot.chests) await strategist.bot.openChest(id).catch(console.error)
                strategist.stop()
            }
            activeStrategists.splice(0, activeStrategists.length)
            currentSetups.clear()

            // Start bots
            for (const characterName of characterNames) {
                const character = AL.Game.characters[characterName]
                if (!character) throw new Error(`Could not find character ${characterName}`)

                let strategist: Strategist<PingCompensatedCharacter>
                switch (character.type) {
                    case "merchant":
                        strategist = new Strategist(
                            await AL.Game.startMerchant(characterName, nextRegion, nextIdentifier),
                        )
                        break
                    case "priest":
                        strategist = new Strategist(
                            await AL.Game.startPriest(characterName, nextRegion, nextIdentifier),
                        )
                        strategist.applyStrategy(PARTY_HEAL_STRATEGY)
                        break
                    case "warrior":
                        strategist = new Strategist(
                            await AL.Game.startWarrior(characterName, nextRegion, nextIdentifier),
                        )
                        strategist.applyStrategy(CHARGE_STRATEGY)
                        break
                    case "mage":
                        strategist = new Strategist(await AL.Game.startMage(characterName, nextRegion, nextIdentifier))
                        strategist.applyStrategy(MAGIPORT_STRATEGY)
                        break
                    case "ranger":
                        strategist = new Strategist(
                            await AL.Game.startRanger(characterName, nextRegion, nextIdentifier),
                        )
                        break
                    case "rogue":
                        strategist = new Strategist(await AL.Game.startRogue(characterName, nextRegion, nextIdentifier))
                        strategist.applyStrategy(GIVE_ROGUE_SPEED_STRATEGY)
                        break
                    case "paladin":
                        strategist = new Strategist(
                            await AL.Game.startPaladin(characterName, nextRegion, nextIdentifier),
                        )
                        break
                }

                // TODO: Holiday spirit strategy
                // TODO: Monster hunt strategy

                if (character.type === "merchant") {
                    strategist.applyStrategies([MERCHANT_DESTROY_STRATEGY, MERCHANT_STRATEGY, TOGGLE_STAND_STRATEGY])
                } else {
                    strategist.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, ELIXIR_STRATEGY])
                }
                strategist.applyStrategies([
                    homeServerStrategy,
                    ACCEPT_PARTY_REQUEST_STRATEGY,
                    AVOID_DEATH_STRATEGY,
                    AVOID_STACKING_STRATEGY,
                    BASE_STRATEGY,
                    BUY_STRATEGY,
                    FIX_STUFF_STRATEGY,
                    ITEM_STRATEGY,
                    RESPAWN_STRATEGY,
                    SELL_STRATEGY,
                    TEMPORAL_STRATEGY,
                    TRACKER_STRATEGY,
                ])

                activeStrategists.push(strategist)

                // First character to start becomes party leader
                if (activeStrategists.length > 0 && strategist.bot.ctype !== "merchant") {
                    strategist.applyStrategy(new RequestPartyStrategy(activeStrategists[0].bot.name))
                }
            }

            currentRegion = nextRegion
            currentIdentifier = nextIdentifier
        }

        // Apply monster attack and move strategies
        const priority: MonsterName[] = [nextMonster, nextMonster, nextMonster]
        for (const _context of activeStrategists) {
            priority.push(...DEFAULT_MONSTERS)
        }
        applySetups(activeStrategists, MONSTER_SETUPS, priority)
        currentMonster = nextMonster
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(() => void managerLoop(), timeoutMs)
    }
}
void managerLoop()
