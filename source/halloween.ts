import AL, {
    EntityModel,
    IPosition,
    Merchant,
    MonsterName,
    PingCompensatedCharacter,
    ServerIdentifier,
    ServerRegion,
} from "alclient"
import { Strategist } from "./strategy_pattern/context"
import { defaultNewMerchantStrategyOptions, NewMerchantStrategy } from "./merchant/strategy"
import { AvoidDeathStrategy } from "./strategy_pattern/strategies/avoid_death"
import { BaseStrategy } from "./strategy_pattern/strategies/base"
import { AvoidStackingStrategy } from "./strategy_pattern/strategies/avoid_stacking"
import { BuyStrategy } from "./strategy_pattern/strategies/buy"
import { adjustItemConfig, DEFAULT_ITEM_CONFIG } from "./base/itemsNew"
import { SellStrategy } from "./strategy_pattern/strategies/sell"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party"
import { DestroyStrategy, MerchantDestroyStrategy } from "./strategy_pattern/strategies/destroy"
import { ToggleStandStrategy } from "./strategy_pattern/strategies/stand"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker"
import { HomeServerStrategy } from "./strategy_pattern/strategies/home_server"
import { ChargeStrategy } from "./strategy_pattern/strategies/charge"
import { GiveRogueSpeedStrategy } from "./strategy_pattern/strategies/rspeed"
import { PartyHealStrategy } from "./strategy_pattern/strategies/partyheal"
import { ItemStrategy } from "./strategy_pattern/strategies/item"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir"
import { MagiportOthersSmartMovingToUsStrategy } from "./strategy_pattern/strategies/magiport"
import { MageAttackStrategy } from "./strategy_pattern/strategies/attack_mage"
import { RETURN_HIGHEST } from "./strategy_pattern/setups/equipment"
import { PriestAttackStrategy } from "./strategy_pattern/strategies/attack_priest"
import { WarriorAttackStrategy } from "./strategy_pattern/strategies/attack_warrior"
import { RangerAttackStrategy } from "./strategy_pattern/strategies/attack_ranger"
import { RogueAttackStrategy } from "./strategy_pattern/strategies/attack_rogue"
import { PaladinAttackStrategy } from "./strategy_pattern/strategies/attack_paladin"
import { SlendermanAttackStrategy, SlendermanMoveStrategy } from "./strategy_pattern/setups/slenderman"
import { SpecialMonsterMoveStrategy, SpreadOutImprovedMoveStrategy } from "./strategy_pattern/strategies/move"
import { halloweenGreenJr } from "./base/locations"

await Promise.all([AL.Game.loginJSONFile("../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G, { remove_abtesting: true, remove_test: true })
void adjustItemConfig(DEFAULT_ITEM_CONFIG)

/**
 * Characters to use for mrgreen and mrpumpkin
 * earthPri will be the third attacking character
 * earthMer will be the merchant
 */
const CHARACTERS_FOR_SERVERS: { [T in ServerRegion]?: { [T in ServerIdentifier]?: string[] } } = {
    US: {
        I: ["earthiverse", "earthRog"],
        II: ["earthRan2", "earthRog2"],
        III: ["earthRan3", "earthRog3"],
        PVP: ["earthiverse", "earthRog"],
    },
    EU: {
        I: ["earthWar", "earthMag"],
        II: ["earthWar2", "earthMag2"],
        PVP: ["earthiverse", "earthRog"],
    },
    ASIA: {
        I: ["earthWar3", "earthMag3"],
    },
}

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
const HALLOWEEN_MONSTERS: MonsterName[] = [...HALLOWEEN_EVENT_MONSTERS, "greenjr", "jr", "osnake"]

const MERCHANT_HOLD_POSITION: IPosition = { map: "halloween", x: 0, y: 0 }

let currentRegion: ServerRegion = "US"
let currentIdentifier: ServerIdentifier = "I"
let currentMonster: MonsterName = HALLOWEEN_IDLE_MONSTER

const activeStrategists: Strategist<PingCompensatedCharacter>[] = []

const ACCEPT_PARTY_REQUEST_STRATEGY = new AcceptPartyRequestStrategy()
const AVOID_DEATH_STRATEGY = new AvoidDeathStrategy()
const AVOID_STACKING_STRATEGY = new AvoidStackingStrategy()
const BASE_STRATEGY = new BaseStrategy(activeStrategists)
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
const SELL_STRATEGY = new SellStrategy()
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
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})

const PALADIN_ATTACK_STRATEGY = new PaladinAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: { mainhand: { name: "fireblade", filters: RETURN_HIGHEST } },
    },
    typeList: HALLOWEEN_MONSTERS,
})

const PRIEST_ATTACK_STRATEGY = new PriestAttackStrategy({
    contexts: activeStrategists,
    disableScare: true, // TODO: Is this smart?
    enableAbsorbToTank: true,
    enableHealStrangers: true,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            offhand: { name: "wbook1", filters: RETURN_HIGHEST },
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
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})

const ROGUE_ATTACK_STRATEGY = new RogueAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: {
            // TODO: Weapons?
            mainhand: { name: "crabclaw", filters: RETURN_HIGHEST },
            offhand: { name: "firestars", filters: RETURN_HIGHEST },
        },
    },
    typeList: HALLOWEEN_MONSTERS,
})
const ROGUE_SLENDERMAN_ATTACK_STRATEGY = new SlendermanAttackStrategy()

const WARRIOR_ATTACK_STRATEGY = new WarriorAttackStrategy({
    contexts: activeStrategists,
    disableCleave: true,
    disableStomp: true,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
            offhand: { name: "fireblade", filters: RETURN_HIGHEST },
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
            mage.applyStrategies([DESTROY_STRATEGY, MAGIPORT_STRATEGY, MAGE_ATTACK_STRATEGY])
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
            paladin.applyStrategies([DESTROY_STRATEGY, PALADIN_ATTACK_STRATEGY])
            strategist = paladin
            break
        }

        // Priests
        case "earthPri":
        case "earthPri2": {
            const priest = new Strategist(await AL.Game.startPriest(name, region, identifier))
            priest.applyStrategies([DESTROY_STRATEGY, PARTY_HEAL_STRATEGY, PRIEST_ATTACK_STRATEGY])
            strategist = priest
            break
        }

        // Rangers
        case "earthiverse":
        case "earthRan2":
        case "earthRan3": {
            const ranger = new Strategist(await AL.Game.startRanger(name, region, identifier))
            ranger.applyStrategies([DESTROY_STRATEGY, RANGER_ATTACK_STRATEGY])
            strategist = ranger
            break
        }

        // Rogues
        case "earthRog":
        case "earthRog2":
        case "earthRog3": {
            const rogue = new Strategist(await AL.Game.startRogue(name, region, identifier))
            rogue.applyStrategies([DESTROY_STRATEGY, GIVE_ROGUE_SPEED_STRATEGY])

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
            warrior.applyStrategies([CHARGE_STRATEGY, DESTROY_STRATEGY, WARRIOR_ATTACK_STRATEGY])
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

    if (monster !== "slenderman" && identifier !== "PVP")
        strategist.applyStrategy(new HomeServerStrategy(region, identifier))

    // First character to start becomes party leader
    if (activeStrategists.length > 0) {
        strategist.applyStrategy(new RequestPartyStrategy(activeStrategists[0].bot.name))
    }

    activeStrategists.push(strategist)
}

const startBotsOnServer = async (region: ServerRegion, identifier: ServerIdentifier, monster: MonsterName) => {
    currentRegion = region
    currentIdentifier = identifier
    currentMonster = monster

    // Determine which bots to use
    let attackingCharacters: string[]
    switch (monster) {
        case "osnake":
        case "mrpumpkin":
        case "mrgreen": {
            attackingCharacters = [...CHARACTERS_FOR_SERVERS[region][identifier], "earthPri"]
            break
        }
        case "slenderman": {
            attackingCharacters = ["earthRog", "earthRog2", "earthRog3"]
            break
        }
    }

    // Start bots
    for (const name of attackingCharacters) await startBot(region, identifier, name, monster)
    await startBot(region, identifier, "earthMer", monster)
}

const logicLoop = async () => {
    /** How many ms to wait until the next check */
    let timeoutMs = 10_000
    try {
        const liveHalloweenMonsters = await EntityModel.find({
            type: { $in: HALLOWEEN_EVENT_MONSTERS },
        })
            .lean()
            .exec()

        // Sort monsters by priority
        liveHalloweenMonsters.sort((a, b) => {
            // Prioritize by type
            if (a.type !== b.type)
                return HALLOWEEN_EVENT_MONSTERS.indexOf(a.type) - HALLOWEEN_EVENT_MONSTERS.indexOf(b.type)

            // Prioritize lower HP
            if (a.hp !== b.hp) return a.hp - b.hp

            // TODO: Prioritize by server
            // Prioritize current server
        })

        const target =
            liveHalloweenMonsters.length === 0
                ? { serverRegion: currentRegion, serverIdentifier: currentIdentifier, type: HALLOWEEN_IDLE_MONSTER }
                : liveHalloweenMonsters[0]

        if (
            target.serverRegion === currentRegion &&
            target.serverIdentifier === currentIdentifier &&
            target.type === currentMonster
        )
            return // No change of target

        if (["mrpumpkin", "mrgreen"].includes(currentMonster) && ["mrpumpkin", "mrgreen"].includes(target.type)) return // Same characters, same strategy

        if (target.serverRegion !== currentRegion || target.serverIdentifier !== currentIdentifier) {
            // Stop current bots
            for (const strategist of activeStrategists) strategist.stop()
            activeStrategists.splice(0, activeStrategists.length)

            // Start new bots
            await startBotsOnServer(target.serverRegion, target.serverIdentifier, target.type)
            timeoutMs = 60_000
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(() => void logicLoop(), timeoutMs)
    }
}
void logicLoop()
