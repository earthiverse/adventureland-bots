import AL, {
    Merchant,
    MonsterName,
    PingCompensatedCharacter,
    ServerIdentifier,
    ServerRegion,
    TrackerData,
} from "alclient"
import { Strategist } from "./strategy_pattern/context.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { Config, constructSetups } from "./strategy_pattern/setups/base.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party.js"
import { AvoidDeathStrategy } from "./strategy_pattern/strategies/avoid_death.js"
import { DEFAULT_ITEM_CONFIG } from "./base/itemsNew.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import { ItemStrategy } from "./strategy_pattern/strategies/item.js"
import { SellStrategy } from "./strategy_pattern/strategies/sell.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"
import { DestroyStrategy } from "./strategy_pattern/strategies/destroy.js"
import { HomeServerStrategy } from "./strategy_pattern/strategies/home_server.js"
import { ChargeStrategy } from "./strategy_pattern/strategies/charge.js"
import { sleep } from "./base/general.js"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir.js"
import { NewMerchantStrategy, defaultNewMerchantStrategyOptions } from "./merchant/strategy.js"
import { MagiportOthersSmartMovingToUsStrategy } from "./strategy_pattern/strategies/magiport.js"
import { PartyHealStrategy } from "./strategy_pattern/strategies/partyheal.js"
import { AvoidStackingStrategy } from "./strategy_pattern/strategies/avoid_stacking.js"

await Promise.all([AL.Game.loginJSONFile("../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

// Tweakable
const SERVER_REGION: ServerRegion = "US"
const SERVER_ID: ServerIdentifier = "I"
const FARMABLE_MONSTERS: MonsterName[] = ["bee", "crab", "goo", "poisio"]

// Important variables
let CURRENT_MONSTER: MonsterName = FARMABLE_MONSTERS[0]
const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
let TRACKER_DATA: TrackerData

// Strategies
const AVOID_DEATH_STRATEGY = new AvoidDeathStrategy()
const AVOID_STACKING_STRATEGY = new AvoidStackingStrategy()
const BASE_STRATEGY = new BaseStrategy(CONTEXTS)
const BUY_STRATEGY = new BuyStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const CHARGE_STRATEGY = new ChargeStrategy()
const DESTROY_STRATEGY = new DestroyStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const ELIXIR_STRATEGY = new ElixirStrategy("elixirluck")
const HOME_STRATEGY = new HomeServerStrategy(SERVER_REGION, SERVER_ID)
const ITEM_STRATEGY = new ItemStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const MAGIPORT_STRATEGY = new MagiportOthersSmartMovingToUsStrategy(CONTEXTS)
const MERCHANT_STRATEGY = new NewMerchantStrategy({
    ...defaultNewMerchantStrategyOptions,
    contexts: CONTEXTS,
})
const PARTY_ACCEPT_STRATEGY = new AcceptPartyRequestStrategy()
const PARTY_HEAL_STRATEGY = new PartyHealStrategy(CONTEXTS)
const RESPAWN_STRATEGY = new RespawnStrategy()
const SELL_STRATEGY = new SellStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const TRACKER_STRATEGY = new TrackerStrategy()

// Setups
const SETUPS = constructSetups(CONTEXTS)

function getCharactersForConfig(config: Config, selectedCharacters: string[] = []): string[] {
    const characters = Object.values(AL.Game.characters)

    const newCharacters = []
    for (const characterConfig of config.characters) {
        try {
            const chosen = characters
                .filter((c) => c.type === characterConfig.ctype && !c.online && !selectedCharacters.includes(c.name))
                .reduce((highest, current) => (highest.level > current.level ? highest : current))?.name

            newCharacters.push(chosen)
            selectedCharacters.push(chosen)
        } catch {
            continue
        }
    }

    return newCharacters
}

async function start() {
    try {
        // Get the latest data for our characters
        await AL.Game.updateServersAndCharacters()

        /**
         * STEP 1
         * Have our merchant get the tracker data
         */

        // Get our highest level merchant
        const merchantName = Object.values(AL.Game.characters)
            .filter((c) => c.type === "merchant" && !c.online)
            .reduce((highest, current) => (highest.level > current.level ? highest : current))?.name
        if (!merchantName) {
            console.error("We couldn't find a merchant to use. Trying again in 60s...")
            setTimeout(() => start(), 60_000)
            return
        }
        console.info(`Using ${merchantName} for our merchant!`)

        console.debug("Retrieving tracker data...")
        const merchant = await AL.Game.startMerchant(merchantName, SERVER_REGION, SERVER_ID)
        if (!merchant.hasItem(["tracker", "supercomputer"])) {
            throw new Error(`This script requires a tracker on the merchant (${merchantName})`)
        }
        TRACKER_DATA = await merchant.getTrackerData()

        /**
         * STEP 2
         * Analyze the tracker data to figure out our strategy
         */
        console.debug("Analyzing tracker data...")
        let nextMonster = CURRENT_MONSTER
        let nextScore = Number.MAX_SAFE_INTEGER
        let nextAdjustedScore = Number.MAX_SAFE_INTEGER
        for (const key of [...FARMABLE_MONSTERS]) {
            const monsterName = key as MonsterName

            // Sanity check
            if (!SETUPS[monsterName]) {
                console.error(`  We don't have a setup for ${monsterName}!`)
                FARMABLE_MONSTERS.splice(FARMABLE_MONSTERS.indexOf(monsterName), 1)
                continue
            }

            const [score] = TRACKER_DATA.max.monsters[monsterName] ?? [0]
            const gMonster = AL.Game.G.monsters[monsterName]

            let completed = true
            let scoreToNextAchievement: number
            for (const [scoreRequired] of gMonster.achievements ?? []) {
                if (score < scoreRequired) {
                    // TODO: Can we incorporate time to kill? Do we want to?
                    completed = false
                    scoreToNextAchievement = Math.ceil(scoreRequired - score)
                    break
                }
            }

            if (completed) {
                console.info(
                    `  We've completed all achievements for ${monsterName}! (${Math.floor(score).toLocaleString()})`,
                )
                FARMABLE_MONSTERS.splice(FARMABLE_MONSTERS.indexOf(monsterName), 1)
                continue
            }

            // Adjust the score 
            // We can kill about 10 1k HP monsters in the same time it takes to kill 1 10k HP monster
            const adjustedScoreToNextAchievement = scoreToNextAchievement * gMonster.hp

            // Farm the monster with the lowest score needed until the next achievement
            if (adjustedScoreToNextAchievement < nextAdjustedScore) {
                nextMonster = monsterName
                nextScore = scoreToNextAchievement
                nextAdjustedScore = adjustedScoreToNextAchievement
            }
        }

        if (FARMABLE_MONSTERS.length === 0) {
            console.warn(`  We have completed the achievements for all monsters!`)
        }

        /**
         * STEP 3
         * We now know which monster we want to farm, let's make a strategy to farm it
         */
        CURRENT_MONSTER = nextMonster
        console.debug(`Creating strategy for ${CURRENT_MONSTER}! (${nextScore.toLocaleString()} to next achievement)`)
        const chosenCharacters: [string, Config][] = []
        for (const config of SETUPS[CURRENT_MONSTER].configs) {
            do {
                const doableCharacters = getCharactersForConfig(
                    config,
                    chosenCharacters.map((c) => c[0]),
                )
                if (doableCharacters.length === 0) break // Not doable
                if (doableCharacters.length + chosenCharacters.length > 3) break // Too many characters

                // We can choose these characters to help farm it
                for (const doableCharacter of doableCharacters) {
                    console.debug(`choosing ${doableCharacter} for ${config.id}`)
                    chosenCharacters.push([doableCharacter, config])
                }
            } while (chosenCharacters.length < 3)
            if (chosenCharacters.length === 3) break // We found a full team
        }

        console.info(`  Choosing ${chosenCharacters.map((c) => c[0]).join("/")}!`)

        // Setup merchant
        const merchantContext = new Strategist<Merchant>(merchant, BASE_STRATEGY)
        merchantContext.applyStrategies([MERCHANT_STRATEGY])
        CONTEXTS.push(merchantContext)

        // Setup characters
        const joinPartyStrategy = new RequestPartyStrategy(merchantName)
        const promises = []
        for (const [chosenCharacter, chosenConfig] of chosenCharacters) {
            const promise = await AL.Game.startCharacter(chosenCharacter, SERVER_REGION, SERVER_ID).then(
                (character) => {
                    const context = new Strategist(character, BASE_STRATEGY)
                    CONTEXTS.push(context)
                    const config = chosenConfig.characters.find((c) => c.ctype === character.ctype)
                    context.applyStrategies([config.attack, config.move, joinPartyStrategy, ELIXIR_STRATEGY])

                    if (character.ctype === "mage") {
                        context.applyStrategies([MAGIPORT_STRATEGY])
                    } else if (character.ctype === "priest") {
                        context.applyStrategies([PARTY_HEAL_STRATEGY])
                    } else if (character.ctype === "warrior") {
                        context.applyStrategies([CHARGE_STRATEGY])
                    }
                },
            )
            promises.push(promise)
        }

        // Wait for all characters to start
        Promise.all(promises)

        // Setup shared
        for (const context of CONTEXTS) {
            context.applyStrategies([
                AVOID_DEATH_STRATEGY,
                AVOID_STACKING_STRATEGY,
                BUY_STRATEGY,
                DESTROY_STRATEGY,
                HOME_STRATEGY,
                ITEM_STRATEGY,
                PARTY_ACCEPT_STRATEGY,
                RESPAWN_STRATEGY,
                SELL_STRATEGY,
                TRACKER_STRATEGY,
            ])
        }
    } catch (e) {
        // We failed to start something!?
        console.error(e)

        // Wait a bit
        await sleep(15_000)

        // Stop all contexts
        for (const context of CONTEXTS) context.stop()

        // Reset contexts
        if (CONTEXTS.length) CONTEXTS.splice(0, CONTEXTS.length)

        // Wait a bit
        await sleep(60_000)

        // Start again
        start()
        return
    }

    // Reset in 15 minutes
    setTimeout(async () => {
        // Stop all contexts
        for (const context of CONTEXTS) context.stop()

        // Reset contexts
        if (CONTEXTS.length) CONTEXTS.splice(0, CONTEXTS.length)

        // Wait a bit for the disconnects to propagate
        await sleep(10_000)

        // Start again
        start()
    }, 900_000)
}

start()
