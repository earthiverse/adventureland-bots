import express from "express"
import path from "path"
import bodyParser from "body-parser"
import cors from "cors"
import { body, validationResult } from "express-validator"

import AL, { Character, CharacterType, ItemName, MonsterName, PingCompensatedCharacter, ServerIdentifier, ServerRegion } from "alclient"
import { Strategist, Strategy } from "../../strategy_pattern/context.js"
import { BaseAttackStrategy } from "../../strategy_pattern/strategies/attack.js"
import { MageAttackStrategy } from "../../strategy_pattern/strategies/attack_mage.js"
import { AvoidStackingStrategy } from "../../strategy_pattern/strategies/avoid_stacking.js"
import { BaseStrategy } from "../../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../../strategy_pattern/strategies/buy.js"
import { ImprovedMoveStrategy } from "../../strategy_pattern/strategies/move.js"
import { RequestPartyStrategy } from "../../strategy_pattern/strategies/party.js"
import { SellStrategy } from "../../strategy_pattern/strategies/sell.js"
import { TrackerStrategy } from "../../strategy_pattern/strategies/tracker.js"
import { RangerAttackStrategy } from "../../strategy_pattern/strategies/attack_ranger.js"
import { RespawnStrategy } from "../../strategy_pattern/strategies/respawn.js"
import { WarriorAttackStrategy } from "../../strategy_pattern/strategies/attack_warrior.js"
import { PriestAttackStrategy } from "../../strategy_pattern/strategies/attack_priest.js"
import { MerchantStrategy } from "../../merchant/strategy.js"

// Login and get GData
await AL.Game.loginJSONFile("../../credentials.json")
await AL.Game.getGData(true, false)
await AL.Pathfinder.prepare(AL.Game.G)

const SERVER_REGION: ServerRegion = "US"
const SERVER_ID: ServerIdentifier = "I"

const MAX_CHARACTERS = 24
const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
const REPLENISHABLES = new Map<ItemName, number>([
    ["hpot1", 2500],
    ["mpot1", 2500]
])
const ITEMS_TO_EXCHANGE = new Set<ItemName>([
    "seashell"
])
const ITEMS_TO_SELL = new Map<ItemName, [number, number][]>([
    ["beewings", undefined],
    ["cclaw", undefined],
    ["crabclaw", undefined],
    ["elixirdex0", undefined],
    ["elixirdex1", undefined],
    ["elixirdex2", undefined],
    ["elixirint0", undefined],
    ["elixirint1", undefined],
    ["elixirint2", undefined],
    ["elixirstr0", undefined],
    ["elixirstr1", undefined],
    ["elixirstr2", undefined],
    ["elixirvit0", undefined],
    ["elixirvit1", undefined],
    ["elixirvit2", undefined],
    ["gslime", undefined],
    ["gstaff", undefined],
    ["hpamulet", undefined],
    ["hpbelt", undefined],
    ["ringsj", undefined],
    ["shield", undefined],
    ["sshield", undefined],
    ["stinger", undefined],
    ["wcap", undefined],
    ["wshoes", undefined],
])
const ITEMS_TO_HOLD = new Set<ItemName>([
    "computer",
    "hpot1",
    "mpot1",
    "supercomputer",
    "tracker"
])
const ITEMS_TO_HOLD_MERCHANT = new Set<ItemName>([
    ...ITEMS_TO_HOLD,
    "cscroll0",
    "cscroll1",
    "cscroll2",
    "offering",
    "offeringp",
    "scroll0",
    "scroll1",
    "scroll2",
])
const GOLD_TO_HOLD = 2_500_000

class DisconnectOnCommandStrategy implements Strategy<Character> {
    private onCodeEval: (data: string) => Promise<void>

    public onApply(bot: Character) {
        this.onCodeEval = async (data: string) => {
            if (data == "stop" || data == "disconnect") {
                stopLulzCharacter(bot.characterID).catch(console.error)
            }
        }

        bot.socket.on("code_eval", this.onCodeEval)
    }

    public onRemove(bot: Character) {
        if (this.onCodeEval) bot.socket.removeListener("code_eval", this.onCodeEval)
    }
}

function getSameOwnerContexts(bot: Character, contexts: Strategist<PingCompensatedCharacter>[]) {
    const sameOwner: Strategist<PingCompensatedCharacter>[] = []
    for (const context of contexts) {
        const other = context.bot
        if (bot.owner !== other.owner) continue
        if (bot == other) continue
        sameOwner.push(context)
    }
    return sameOwner
}

// Strategies
const baseStrategy = new BaseStrategy(CONTEXTS)
const trackerStrategy = new TrackerStrategy()
const disconnectStrategy = new DisconnectOnCommandStrategy()
const avoidStackingStrategy = new AvoidStackingStrategy()
// TODO: New party strategy where you party with your own merchant if you have one, first, if not "earthMer"
const partyStrategy = new RequestPartyStrategy("earthMer")
const respawnStrategy = new RespawnStrategy()
const buyStrategy = new BuyStrategy({
    buyMap: undefined,
    replenishables: REPLENISHABLES
})
const sellStrategy = new SellStrategy({
    sellMap: ITEMS_TO_SELL
})

function runChecks(characterID: string) {
    if (CONTEXTS.length >= MAX_CHARACTERS) throw `Too many characters are already running (We only support ${MAX_CHARACTERS} characters simultaneously)`
    for (const context of CONTEXTS) {
        const character = context.bot
        if (character.characterID == characterID) throw `There is a character with the ID '${characterID}' (${character.id}) already running. Stop the character first to change its settings.`
    }
}

async function startLulzMerchant(userID: string, userAuth: string, characterID: string) {
    runChecks(characterID)

    const bot = new AL.Merchant(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
    await bot.connect()

    const context = new Strategist(bot, baseStrategy)
    CONTEXTS.push(context)

    // Create a list of contexts of only those belonging to us
    const friends: Strategist<PingCompensatedCharacter>[] = []
    const updateFriendLoop = () => {
        try {
            if (context.isStopped()) return // Stop updating friends if we've stopped
            friends.splice(0, friends.length)
            friends.push(...getSameOwnerContexts(bot, CONTEXTS))
        } catch (e) {
            console.error(e)
        }
        setTimeout(updateFriendLoop, 30000)
    }
    updateFriendLoop()

    const merchantMoveStrategy = new MerchantStrategy(friends, {
        defaultPosition: {
            map: "main",
            x: 0,
            y: 0
        },
        enableBuyAndUpgrade: {
            upgradeToLevel: 9
        },
        enableBuyReplenishables: {
            all: REPLENISHABLES,
            ratio: 0.5,
        },
        enableExchange: {
            items: ITEMS_TO_EXCHANGE
        },
        enableFishing: true,
        enableMining: true,
        enableOffload: {
            esize: 3,
            goldToHold: GOLD_TO_HOLD,
            itemsToHold: ITEMS_TO_HOLD,
        },
        goldToHold: GOLD_TO_HOLD * 4,
        itemsToHold: ITEMS_TO_HOLD_MERCHANT,
    })

    context.applyStrategy(disconnectStrategy)
    context.applyStrategy(merchantMoveStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(sellStrategy)
    context.applyStrategy(partyStrategy)
}

async function startLulzCharacter(type: CharacterType, userID: string, userAuth: string, characterID: string, monsters: MonsterName[], options = {
    serverId: SERVER_ID,
    serverRegion: SERVER_REGION
}) {
    runChecks(characterID)

    if (monsters.includes("snake")) monsters.push("osnake")

    let bot: PingCompensatedCharacter
    switch (type) {
        case "mage": {
            bot = new AL.Mage(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[options.serverRegion][options.serverId])
            break
        }
        case "paladin": {
            bot = new AL.Paladin(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[options.serverRegion][options.serverId])
            break
        }
        case "priest": {
            bot = new AL.Priest(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[options.serverRegion][options.serverId])
            break
        }
        case "ranger": {
            bot = new AL.Ranger(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[options.serverRegion][options.serverId])
            break
        }
        case "rogue": {
            bot = new AL.Rogue(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[options.serverRegion][options.serverId])
            break
        }
        case "warrior": {
            bot = new AL.Warrior(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[options.serverRegion][options.serverId])
            break
        }
    }
    await bot.connect()

    const context = new Strategist(bot, baseStrategy)
    CONTEXTS.push(context)

    context.applyStrategy(disconnectStrategy)

    switch (type) {
        case "mage": {
            context.applyStrategy(new MageAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters] }))
            break
        }
        case "priest": {
            context.applyStrategy(new PriestAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters] }))
            break
        }
        case "ranger": {
            context.applyStrategy(new RangerAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters] }))
            break
        }
        case "warrior": {
            context.applyStrategy(new WarriorAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters] }))
            break
        }
        default: {
            context.applyStrategy(new BaseAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters] }))
            break
        }
    }

    const moveStrategy = new ImprovedMoveStrategy(monsters)
    context.applyStrategy(moveStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(sellStrategy)
    context.applyStrategy(partyStrategy)

    setInterval(async () => {
        // TODO: Move this to a move strategy
        try {
            if (context.bot.smartMoving) return
            if (((!context.bot.hasItem(["hpot1", "mpot1"])) && context.bot.gold > (AL.Game.G.items.mpot1.g * 100)) || context.bot.isFull()) {
                // Go get potions
                context.removeStrategy(moveStrategy)

                await context.bot.smartMove("mpot1", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })

                let potsToBuy = Math.min(100 - context.bot.countItem("mpot1"), context.bot.gold / AL.Game.G.items.mpot1.g)
                if (potsToBuy > 0) await context.bot.buy("mpot1", potsToBuy)

                potsToBuy = Math.min(100 - context.bot.countItem("hpot1"), context.bot.gold / AL.Game.G.items.hpot1.g)
                if (potsToBuy > 0) await context.bot.buy("hpot1", potsToBuy)
            }
        } catch (e) {
            console.error(e)
        }
        context.applyStrategy(moveStrategy)
    }, 1000)
}

async function stopLulzCharacter(characterID: string) {
    for (let i = 0; i < CONTEXTS.length; i++) {
        const context = CONTEXTS[i]
        if (context.bot.characterID !== characterID) continue

        // Stop the context, and remove it from our contexts list
        context.stop()
        CONTEXTS.splice(i, 1)[0]
        break
    }
}

const app = express()
app.use(express.json())
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
const port = 80

app.get("/", (_req, res) => {
    res.sendFile(path.join(path.resolve(), "/index.html"))
})

app.post("/",
    body("user").trim().isLength({ max: 16, min: 16 }).withMessage("User IDs are exactly 16 digits."),
    body("user").trim().isNumeric().withMessage("User IDs are numeric"),
    body("auth").trim().isLength({ max: 21, min: 21 }).withMessage("Auth codes are exactly 21 characters."),
    body("auth").trim().isAlphanumeric("en-US", { ignore: /\s/ }).withMessage("Auth codes are alphanumeric."),
    body("char").trim().isLength({ max: 16, min: 16 }).withMessage("Character IDs are exactly 16 digits."),
    body("char").trim().isNumeric().withMessage("Character IDs are numeric"),
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        try {
            const charType = req.body.char_type
            const monster = req.body.monster

            // Filter out unwanted match-ups
            switch (charType) {
                case "mage": {
                    const mageMonsters: MonsterName[] = ["armadillo", "bee", "crab", "croc", "goo", "scorpion", "snake", "spider"]
                    if (!mageMonsters.includes(monster)) {
                        return res.status(400).send(`This service doesn't currently support ${monster} for ${charType}, sorry!`)
                    }
                    break
                }
                case "merchant": {
                    // TODO: Should we only allow merchants if there's other characters?
                    break
                }
                case "ranger": {
                    const rangerMonsters: MonsterName[] = ["armadillo", "bee", "crab", "croc", "goo", "scorpion", "snake", "spider"]
                    if (!rangerMonsters.includes(monster)) {
                        return res.status(400).send(`This service doesn't currently support ${monster} for ${charType}, sorry!`)
                    }
                    break
                }
                case "warrior": {
                    const warriorMonsters: MonsterName[] = ["bee", "crab", "croc", "goo", "scorpion", "snake", "spider"]
                    if (!warriorMonsters.includes(monster)) {
                        return res.status(400).send(`This service doesn't currently support ${monster} for ${charType}, sorry!`)
                    }
                    break
                }
                default: {
                    return res.status(400).send(`This service doesn't currently support ${monster} for ${charType}, sorry!`)
                }
            }

            if (charType == "merchant") {
                await startLulzMerchant(req.body.user, req.body.auth, req.body.char)
            } else if (monster == "bee") {
                // For extra lulz, farm bees on PvP
                await startLulzCharacter(charType, req.body.user, req.body.auth, req.body.char, ["bee"], { serverId: "PVP", serverRegion: "US" })
            } else {
                // It passed the filter, start it up
                await startLulzCharacter(charType, req.body.user, req.body.auth, req.body.char, [monster])
            }
            return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
        } catch (e) {
            return res.status(500).send(e)
        }
        // return res.status(500).send("Something went wrong, your character probably didn't start. Check https://adventure.land/comm to confirm.")
    })

app.listen(port, async () => {
    console.log(`Ready on port ${port}!`)
})