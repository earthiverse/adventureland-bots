import AL, {
    EntityModel,
    IPosition,
    Merchant,
    MonsterName,
    PingCompensatedCharacter,
    ServerIdentifier,
    ServerRegion,
} from "alclient"
import { Strategist } from "../strategy_pattern/context.js"
import { defaultNewMerchantStrategyOptions, NewMerchantStrategy } from "../merchant/strategy.js"
import { AvoidDeathStrategy } from "../strategy_pattern/strategies/avoid_death.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { AvoidStackingStrategy } from "../strategy_pattern/strategies/avoid_stacking.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { adjustItemConfig, DEFAULT_ITEM_CONFIG } from "../base/itemsNew.js"
import { SellStrategy } from "../strategy_pattern/strategies/sell.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { DestroyStrategy, MerchantDestroyStrategy } from "../strategy_pattern/strategies/destroy.js"
import { ToggleStandStrategy } from "../strategy_pattern/strategies/stand.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { HomeServerStrategy } from "../strategy_pattern/strategies/home_server.js"
import { ChargeStrategy } from "../strategy_pattern/strategies/charge.js"
import { GiveRogueSpeedStrategy } from "../strategy_pattern/strategies/rspeed.js"
import { PartyHealStrategy } from "../strategy_pattern/strategies/partyheal.js"
import { ItemStrategy } from "../strategy_pattern/strategies/item.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { ElixirStrategy } from "../strategy_pattern/strategies/elixir.js"
import { MagiportOthersSmartMovingToUsStrategy } from "../strategy_pattern/strategies/magiport.js"
import { MageAttackStrategy } from "../strategy_pattern/strategies/attack_mage.js"
import {
    MAGE_SPLASH_WEAPONS,
    RANGER_SPLASH_WEAPONS,
    RETURN_HIGHEST,
    WARRIOR_SPLASH_WEAPONS,
    ZAPPER_CRING,
    ZAPPER_STRRING,
} from "../strategy_pattern/setups/equipment.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategy_pattern/strategies/attack_warrior.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategy_pattern/strategies/attack_rogue.js"
import { PaladinAttackStrategy } from "../strategy_pattern/strategies/attack_paladin.js"
import { SlendermanAttackStrategy, SlendermanMoveStrategy } from "../strategy_pattern/setups/slenderman.js"
import { SpecialMonsterMoveStrategy, SpreadOutImprovedMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { halloweenGreenJr } from "../base/locations.js"
import { BoosterStrategy } from "../strategy_pattern/strategies/booster.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G, { remove_abtesting: true, remove_test: true })
void adjustItemConfig(DEFAULT_ITEM_CONFIG)

/**
 * Characters to use for mrgreen and mrpumpkin
 * PRIEST_CHARACTER will be the third attacking character
 * earthMer will be the merchant
 */
const CHARACTERS_FOR_SERVERS: { [T in ServerRegion]?: { [T in ServerIdentifier]?: string[] } } = {
    US: {
        I: ["earthiverse", "earthRog"],
        II: ["earthRan2", "earthRog2"],
        III: ["earthRan3", "earthRog3"],
        PVP: ["earthRog", "earthRog2"],
    },
    EU: {
        I: ["earthWar", "earthMag"],
        II: ["earthWar2", "earthMag2"],
        PVP: ["earthRog", "earthRog2"],
    },
    ASIA: {
        I: ["earthWar3", "earthMag3"],
    },
}

/** Also start priest for healing */
const PRIEST_CHARACTER = "earthPri"

// Sanity check that we aren't using characters for more than one server
// (other than PVP)
const UNIQUE_CHARACTERS = new Map<string, string>()
for (const region of Object.keys(CHARACTERS_FOR_SERVERS)) {
    for (const identifier of Object.keys(CHARACTERS_FOR_SERVERS[region as ServerRegion])) {
        if (identifier === "PVP") continue
        const characters = CHARACTERS_FOR_SERVERS[region as ServerRegion][identifier as ServerIdentifier]
        for (const character of characters) {
            if (UNIQUE_CHARACTERS.has(character))
                throw new Error(
                    `${character} is assigned to ${region}${identifier} and ${UNIQUE_CHARACTERS.get(character)}`,
                )
            UNIQUE_CHARACTERS.set(character, `${region}${identifier}`)
        }
    }
}

/** What monster to farm while waiting */
const HALLOWEEN_IDLE_MONSTER: MonsterName = "osnake"

/** Halloween monsters, sorted by priority (high -> low) */
const HALLOWEEN_EVENT_MONSTERS: MonsterName[] = ["mrpumpkin", "mrgreen", "slenderman"]

/** All monsters we're farming */
const HALLOWEEN_MONSTERS: MonsterName[] = [
    "greenjr",
    "jr",
    ...HALLOWEEN_EVENT_MONSTERS,
    "osnake",
    "xscorpion",
    "minimush",
    "osnake",
    "snake",
]

const MERCHANT_HOLD_POSITION: IPosition = { map: "halloween", x: 0, y: 0 }

let currentRegion: ServerRegion = "US"
let currentIdentifier: ServerIdentifier = "HARDCORE" // Start on a non-existent server, the first loop will set this to something else

type Server = `${ServerRegion}${ServerIdentifier}`
const SERVER_PRIORITY: Server[] = ["USI", "EUI", "USII", "USIII", "EUII", "ASIAI", "USPVP", "EUPVP"]

const activeStrategists: Strategist<PingCompensatedCharacter>[] = []

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
const DESTROY_STRATEGY = new DestroyStrategy()
const ELIXIR_STRATEGY = new ElixirStrategy("elixirluck")
const GIVE_ROGUE_SPEED_STRATEGY = new GiveRogueSpeedStrategy()
const ITEM_STRATEGY = new ItemStrategy({
    contexts: activeStrategists,
    itemConfig: DEFAULT_ITEM_CONFIG,
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
const TOGGLE_STAND_STRATEGY = new ToggleStandStrategy({
    offWhenMoving: true,
    onWhenNear: [{ distance: 10, position: MERCHANT_HOLD_POSITION }],
})
const TRACKER_STRATEGY = new TrackerStrategy()

const MAGE_ATTACK_STRATEGY = new MageAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            offhand: { name: "wbook1", filters: RETURN_HIGHEST },
            orb: { name: "jacko", filters: RETURN_HIGHEST },
            ...ZAPPER_CRING,
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})
const MAGE_ATTACK_STRATEGY_SPLASH = new MageAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: {
            ...MAGE_SPLASH_WEAPONS,
            orb: { name: "jacko", filters: RETURN_HIGHEST },
            ...ZAPPER_CRING,
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})

const PALADIN_ATTACK_STRATEGY = new PaladinAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: { mainhand: { name: "fireblade", filters: RETURN_HIGHEST } },
        ...ZAPPER_CRING,
    },
    typeList: HALLOWEEN_MONSTERS,
})

const PRIEST_ATTACK_STRATEGY = new PriestAttackStrategy({
    contexts: activeStrategists,
    enableAbsorbToTank: true,
    enableHealStrangers: true,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            offhand: { name: "wbook1", filters: RETURN_HIGHEST },
            orb: { name: "jacko", filters: RETURN_HIGHEST },
            ...ZAPPER_CRING,
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})

const RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "firebow", filters: RETURN_HIGHEST },
            offhand: { name: "t2quiver", filters: RETURN_HIGHEST },
            ...ZAPPER_CRING,
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})
const RANGER_ATTACK_STRATEGY_SPLASH = new RangerAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: {
            ...RANGER_SPLASH_WEAPONS,
            ...ZAPPER_CRING,
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})

const ROGUE_ATTACK_STRATEGY = new RogueAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "crabclaw", filters: RETURN_HIGHEST },
            offhand: { name: "firestars", filters: RETURN_HIGHEST },
            helmet: { name: "helmet1", filters: RETURN_HIGHEST },
            chest: { name: "coat1", filters: RETURN_HIGHEST },
            pants: { name: "pants1", filters: RETURN_HIGHEST },
            shoes: { name: "shoes1", filters: RETURN_HIGHEST },
            gloves: { name: "mpxgloves", filters: RETURN_HIGHEST },
            belt: { name: "dexbelt", filters: RETURN_HIGHEST },
            amulet: { name: "mpxamulet", filters: RETURN_HIGHEST },
            // TODO: Orb?
            ...ZAPPER_CRING,
            earring1: { name: "dexearring", filters: RETURN_HIGHEST },
            earring2: { name: "dexearring", filters: RETURN_HIGHEST },
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})
const ROGUE_SLENDERMAN_ATTACK_STRATEGY = new SlendermanAttackStrategy()

const WARRIOR_ATTACK_STRATEGY = new WarriorAttackStrategy({
    contexts: activeStrategists,
    disableStomp: true,
    enableEquipForCleave: true,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
            offhand: { name: "fireblade", filters: RETURN_HIGHEST },
            ...ZAPPER_STRRING,
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})
const WARRIOR_ATTACK_STRATEGY_SPLASH = new WarriorAttackStrategy({
    contexts: activeStrategists,
    disableStomp: true,
    enableEquipForCleave: true,
    generateEnsureEquipped: {
        prefer: {
            ...WARRIOR_SPLASH_WEAPONS,
            ...ZAPPER_STRRING,
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})

const MRGREEN_MOVE_STRATEGY = new SpecialMonsterMoveStrategy({ contexts: activeStrategists, typeList: ["mrgreen"] })
const MRPUMPKIN_MOVE_STRATEGY = new SpecialMonsterMoveStrategy({ contexts: activeStrategists, typeList: ["mrpumpkin"] })
const OSNAKE_MOVE_STRATEGY = new SpreadOutImprovedMoveStrategy(["osnake", "snake"], { idlePosition: halloweenGreenJr })
const SLENDERMAN_MOVE_STRATEGY_1 = new SlendermanMoveStrategy({ map: "cave" })
const SLENDERMAN_MOVE_STRATEGY_2 = new SlendermanMoveStrategy({ map: "halloween" })
const SLENDERMAN_MOVE_STRATEGY_3 = new SlendermanMoveStrategy({ map: "spookytown" })

const startBot = async (region: ServerRegion, identifier: ServerIdentifier, name: string, monster: MonsterName) => {
    let strategist: Strategist<PingCompensatedCharacter>
    switch (name) {
        // Mages
        case "earthMag":
        case "earthMag2":
        case "earthMag3": {
            const mage = new Strategist(await AL.Game.startMage(name, region, identifier))
            strategist = mage
            mage.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, MAGIPORT_STRATEGY])
            mage.applyStrategy(
                identifier === "PVP" && monster === "mrpumpkin" ? MAGE_ATTACK_STRATEGY : MAGE_ATTACK_STRATEGY_SPLASH,
            )
            break
        }

        // Merchants
        case "earthMer":
        case "earthMer2":
        case "earthMer3": {
            const merchant = new Strategist(await AL.Game.startMerchant(name, region, identifier))
            merchant.applyStrategies([MERCHANT_DESTROY_STRATEGY, MERCHANT_STRATEGY, TOGGLE_STAND_STRATEGY])
            strategist = merchant
            break
        }

        // Paladins
        case "earthPal": {
            const paladin = new Strategist(await AL.Game.startPaladin(name, region, identifier))
            paladin.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, PALADIN_ATTACK_STRATEGY])
            strategist = paladin
            break
        }

        // Priests
        case "earthPri":
        case "earthPri2": {
            const priest = new Strategist(await AL.Game.startPriest(name, region, identifier))
            priest.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, PARTY_HEAL_STRATEGY, PRIEST_ATTACK_STRATEGY])
            strategist = priest
            break
        }

        // Rangers
        case "earthiverse":
        case "earthRan2":
        case "earthRan3": {
            const ranger = new Strategist(await AL.Game.startRanger(name, region, identifier))
            ranger.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, RANGER_ATTACK_STRATEGY])
            ranger.applyStrategy(
                identifier === "PVP" && monster === "mrpumpkin"
                    ? RANGER_ATTACK_STRATEGY
                    : RANGER_ATTACK_STRATEGY_SPLASH,
            )
            strategist = ranger
            break
        }

        // Rogues
        case "earthRog":
        case "earthRog2":
        case "earthRog3": {
            const rogue = new Strategist(await AL.Game.startRogue(name, region, identifier))
            rogue.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, GIVE_ROGUE_SPEED_STRATEGY])

            if (monster === "slenderman") {
                rogue.applyStrategy(ROGUE_SLENDERMAN_ATTACK_STRATEGY)
            } else {
                rogue.applyStrategy(ROGUE_ATTACK_STRATEGY)
            }

            strategist = rogue
            break
        }

        // Warriors
        case "earthWar":
        case "earthWar2":
        case "earthWar3": {
            const warrior = new Strategist(await AL.Game.startWarrior(name, region, identifier))
            warrior.applyStrategies([BOOSTER_STRATEGY, CHARGE_STRATEGY, DESTROY_STRATEGY, WARRIOR_ATTACK_STRATEGY])
            warrior.applyStrategy(
                identifier === "PVP" && monster === "mrpumpkin"
                    ? WARRIOR_ATTACK_STRATEGY
                    : WARRIOR_ATTACK_STRATEGY_SPLASH,
            )
            strategist = warrior
            break
        }
    }

    // Strategies for all bots
    strategist.applyStrategies([
        ACCEPT_PARTY_REQUEST_STRATEGY,
        AVOID_DEATH_STRATEGY,
        AVOID_STACKING_STRATEGY,
        BASE_STRATEGY,
        BUY_STRATEGY,
        ELIXIR_STRATEGY,
        ITEM_STRATEGY,
        RESPAWN_STRATEGY,
        SELL_STRATEGY,
        TRACKER_STRATEGY,
    ])

    // Move strategies
    if (!(strategist.bot instanceof Merchant)) {
        if (monster === "mrgreen") strategist.applyStrategy(MRGREEN_MOVE_STRATEGY)
        else if (monster === "mrpumpkin") strategist.applyStrategy(MRPUMPKIN_MOVE_STRATEGY)
        else if (monster === "osnake") strategist.applyStrategy(OSNAKE_MOVE_STRATEGY)
        else if (monster === "slenderman") {
            if (name === "earthRog") strategist.applyStrategy(SLENDERMAN_MOVE_STRATEGY_1)
            else if (name === "earthRog2") strategist.applyStrategy(SLENDERMAN_MOVE_STRATEGY_2)
            else if (name === "earthRog3") strategist.applyStrategy(SLENDERMAN_MOVE_STRATEGY_3)
            else throw new Error(`${name} shouldn't be farming slenderman`)
        }
    }

    if (monster !== "slenderman" && identifier !== "PVP" && name !== PRIEST_CHARACTER)
        strategist.applyStrategy(new HomeServerStrategy(region, identifier))

    // First character to start becomes party leader
    if (activeStrategists.length > 0 && strategist.bot.ctype !== "merchant") {
        strategist.applyStrategy(new RequestPartyStrategy(activeStrategists[0].bot.name))
    }

    activeStrategists.push(strategist)
}

const startBotsOnServer = async (region: ServerRegion, identifier: ServerIdentifier, monster: MonsterName) => {
    currentRegion = region
    currentIdentifier = identifier

    // Determine which bots to use
    let attackingCharacters: string[]
    switch (monster) {
        case "osnake":
        case "mrpumpkin":
        case "mrgreen": {
            attackingCharacters = [...CHARACTERS_FOR_SERVERS[region][identifier], PRIEST_CHARACTER]
            break
        }
        case "slenderman": {
            attackingCharacters = ["earthRog", "earthRog2", "earthRog3"]
            break
        }
    }

    // Start bots
    for (const name of attackingCharacters) await startBot(region, identifier, name, monster).catch(console.error)
    await startBot(region, identifier, "earthMer", monster).catch(console.error)

    // Backup merchant if `earthMer` gets stuck
    let hasMerch = activeStrategists.some((s) => s.bot.ctype === "merchant")
    if (!hasMerch) {
        try {
            await startBot(region, identifier, "earthMer2", monster)
            hasMerch = true
        } catch (e) {
            console.error(e)
        }
    }

    // Backup priest if `earthPri` gets stuck
    const hasPriest = activeStrategists.some((s) => s.bot.ctype === "priest")
    if (!hasPriest) await startBot(region, identifier, "earthPri2", monster).catch(console.error)

    // Backup additional character
    if ((hasMerch && activeStrategists.length < 4) || (!hasMerch && activeStrategists.length < 3)) {
        await startBot(region, identifier, "earthPal", monster).catch(console.error)
    }
}

const logicLoop = async () => {
    /** How many ms to wait until the next check */
    let timeoutMs = 10_000
    try {
        console.debug("Looking for Halloween monsters...")
        const liveHalloweenMonsters = await EntityModel.find({
            type: { $in: HALLOWEEN_EVENT_MONSTERS },
        })
            .lean()
            .exec()

        // Sort monsters by priority
        const monsterRank = (t: MonsterName) => {
            if (t === "mrpumpkin" || t === "mrgreen") return 0
            return 1 // slenderman
        }
        liveHalloweenMonsters.sort((a, b) => {
            // Prioritize by type
            const aRank = monsterRank(a.type)
            const bRank = monsterRank(b.type)
            if (aRank !== bRank) return aRank - bRank

            // Prioritize lower HP
            if (a.hp !== b.hp) return a.hp - b.hp

            // Prioritize same server
            const aSameServer = a.serverIdentifier === currentIdentifier && a.serverRegion === currentRegion
            const bSameServer = b.serverIdentifier === currentIdentifier && b.serverRegion === currentRegion
            if (aSameServer && !bSameServer) return -1
            if (!aSameServer && bSameServer) return 1

            // Proritize by server
            const aServer: Server = `${a.serverRegion}${a.serverIdentifier}`
            const bServer: Server = `${b.serverRegion}${b.serverIdentifier}`
            if (aServer !== bServer) return SERVER_PRIORITY.indexOf(aServer) - SERVER_PRIORITY.indexOf(bServer)
        })

        const target =
            liveHalloweenMonsters.length === 0
                ? { serverRegion: currentRegion, serverIdentifier: currentIdentifier, type: HALLOWEEN_IDLE_MONSTER }
                : liveHalloweenMonsters[0]

        if (target.serverRegion !== currentRegion || target.serverIdentifier !== currentIdentifier) {
            console.debug(
                `Switching from ${currentRegion}${currentIdentifier} to ${target.serverRegion}${target.serverIdentifier}...`,
            )
            // Stop current bots
            for (const strategist of activeStrategists) strategist.stop()
            activeStrategists.splice(0, activeStrategists.length)

            // Start new bots
            await startBotsOnServer(target.serverRegion, target.serverIdentifier, target.type)
            timeoutMs = 60_000

            currentRegion = target.serverRegion
            currentIdentifier = target.serverIdentifier
            return
        }

        // Same characters, just ensure we're using the correct move strategy
        for (const strategist of activeStrategists) {
            if (strategist.bot.ctype === "merchant") continue // Merchant does their own thing
            if (target.type === "mrpumpkin") {
                if (strategist.hasStrategy(OSNAKE_MOVE_STRATEGY)) strategist.removeStrategy(OSNAKE_MOVE_STRATEGY)
                if (strategist.hasStrategy(MRGREEN_MOVE_STRATEGY)) strategist.removeStrategy(MRGREEN_MOVE_STRATEGY)
                if (!strategist.hasStrategy(MRPUMPKIN_MOVE_STRATEGY)) strategist.applyStrategy(MRPUMPKIN_MOVE_STRATEGY)
            } else if (target.type === "mrgreen") {
                if (strategist.hasStrategy(OSNAKE_MOVE_STRATEGY)) strategist.removeStrategy(OSNAKE_MOVE_STRATEGY)
                if (strategist.hasStrategy(MRPUMPKIN_MOVE_STRATEGY)) strategist.removeStrategy(MRPUMPKIN_MOVE_STRATEGY)
                if (!strategist.hasStrategy(MRGREEN_MOVE_STRATEGY)) strategist.applyStrategy(MRGREEN_MOVE_STRATEGY)
            } else if (target.type === HALLOWEEN_IDLE_MONSTER) {
                if (strategist.hasStrategy(MRGREEN_MOVE_STRATEGY)) strategist.removeStrategy(MRGREEN_MOVE_STRATEGY)
                if (strategist.hasStrategy(MRPUMPKIN_MOVE_STRATEGY)) strategist.removeStrategy(MRPUMPKIN_MOVE_STRATEGY)
                if (!strategist.hasStrategy(OSNAKE_MOVE_STRATEGY)) strategist.applyStrategy(OSNAKE_MOVE_STRATEGY)
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(() => void logicLoop(), timeoutMs)
    }
}
void logicLoop()
