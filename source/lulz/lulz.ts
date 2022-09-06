import express from "express"
import path from "path"
import bodyParser from "body-parser"
import cors from "cors"
import { body, validationResult } from "express-validator"

import AL, { BankPackName, Character, CharacterType, ItemName, Merchant, MonsterName, PingCompensatedCharacter, ServerIdentifier, ServerRegion, SlotType } from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseAttackStrategy } from "../strategy_pattern/strategies/attack.js"
import { MageAttackStrategy } from "../strategy_pattern/strategies/attack_mage.js"
import { AvoidStackingStrategy } from "../strategy_pattern/strategies/avoid_stacking.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { ImprovedMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { SellStrategy } from "../strategy_pattern/strategies/sell.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { WarriorAttackStrategy } from "../strategy_pattern/strategies/attack_warrior.js"
import { bankingPosition } from "../base/locations.js"
import { checkOnlyEveryMS, sleep } from "../base/general.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"
import { getUnimportantInventorySlots } from "../base/banking.js"

// Login and get GData
await AL.Game.loginJSONFile("../../credentials.json")
await AL.Game.getGData(true, false)
await AL.Pathfinder.prepare(AL.Game.G)

const SERVER_REGION: ServerRegion = "US"
const SERVER_ID: ServerIdentifier = "I"

const MAX_CHARACTERS = 12
const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
const REPLENISHABLES = new Map<ItemName, number>([
    ["hpot1", 2500],
    ["mpot1", 2500]
])
const ITEMS_TO_SELL = new Map<ItemName, [number, number][]>([
    ["beewings", undefined],
    ["cclaw", undefined],
    ["crabclaw", undefined],
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
        bot.socket.removeListener("code_eval", this.onCodeEval)
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

class LulzMerchantMoveStrategy implements Strategy<Merchant> {
    public loops = new Map<LoopName, Loop<Merchant>>()

    private contexts: Strategist<PingCompensatedCharacter>[]

    private options: {
        replenishRatio: number
    }

    public constructor(contexts: Strategist<PingCompensatedCharacter>[], options = {
        replenishRatio: 0.5
    }) {
        this.contexts = contexts
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Merchant) => { await this.move(bot) },
            interval: 250
        })
    }

    private async move(bot: Merchant) {
        const friendContexts = getSameOwnerContexts(bot, this.contexts)

        try {
            // TODO: Emergency banking if full

            // Do banking if we are full, we have a lot of gold, or it's been a while (15 minutes)
            if (bot.esize < 5 || bot.gold > (GOLD_TO_HOLD * 2) || checkOnlyEveryMS(`${bot.id}_banking`, 900_000)) {
                // Move to town first, to have a chance to sell unwanted items
                await bot.smartMove("main")

                // Then go to the bank to bank things
                await bot.smartMove(bankingPosition)
                for (let i = 0; i < bot.isize; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item
                    if (item.l) continue // Don't want to bank locked items
                    if (ITEMS_TO_HOLD_MERCHANT.has(item.name)) continue // We want to hold this item
                    await bot.depositItem(i)
                }

                if (bot.gold > GOLD_TO_HOLD) {
                    await bot.depositGold(bot.gold - GOLD_TO_HOLD)
                } else if (bot.gold < GOLD_TO_HOLD) {
                    await bot.withdrawGold(GOLD_TO_HOLD - bot.gold)
                }

                await bot.smartMove("main")
            }

            // Find own characters with low replenishables and go deliver some
            for (const friendContext of friendContexts) {
                const friend = friendContext.bot
                for (const [item, numTotal] of REPLENISHABLES) {
                    const numHave = friend.countItem(item)
                    if (numHave > numTotal * this.options.replenishRatio) continue // They still have enough
                    if ((AL.Game.G.items[item].g * (numTotal - numHave)) > bot.gold) continue // We don't have enough gold to buy them all

                    // Go buy the item
                    if (!bot.canBuy(item)
                        && bot.countItem(item) < numTotal * 2 /** Keep enough replenishables for ourself, too */) {
                        await bot.smartMove(item, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED / 2 })
                        await bot.buy(item, numTotal - numHave)
                    }

                    // Go deliver the item
                    await bot.smartMove(friend, { getWithin: 25 })
                    if (AL.Tools.squaredDistance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                        // We're not near them, so they must have moved, return so we can try again next loop
                        return
                    }
                    await bot.sendItem(friend.id, bot.locateItem(item, bot.items), numTotal - numHave)
                }
            }

            // Find own characters with low inventory space and go grab some items off of them
            for (const friendContext of friendContexts) {
                const friend = friendContext.bot
                if (friend.esize > 3) continue // They still have enough free space
                if (friend.canSell()) continue // They can sell things themselves where they are

                // Check if they have items that we can grab
                let hasItemWeWant = false
                for (let i = 0; i < friend.isize; i++) {
                    const item = friend.items[i]
                    if (!item) continue // No item here
                    if (item.l) continue // Can't send locked items
                    if (ITEMS_TO_HOLD.has(item.name)) continue // We want to hold this item
                    hasItemWeWant = true
                    break
                }
                if (!hasItemWeWant) continue // They are full, but they're full of useful items

                console.log(`[${bot.id}] Going to get items from ${friend.id}!`)

                // Go find them
                await bot.smartMove(friend, { getWithin: 25 })
                if (AL.Tools.squaredDistance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                    // We're not near them, so they must have moved, return so we can try again next loop
                    return
                }

                // Grab extra gold
                if (friend.gold > GOLD_TO_HOLD) {
                    // Take their gold for safe keeping
                    await friend.sendGold(bot.id, friend.gold - GOLD_TO_HOLD)
                } else if (bot.gold > GOLD_TO_HOLD) {
                    // Send them some of our gold
                    await bot.sendGold(friend.id, Math.min(bot.gold - GOLD_TO_HOLD, GOLD_TO_HOLD - friend.gold))
                }

                // Grab items
                while (bot.esize > 2) {
                    for (let i = 0; i < friend.isize; i++) {
                        const item = friend.items[i]
                        if (!item) continue // No item here
                        if (item.l) continue // Can't send locked items
                        if (ITEMS_TO_HOLD.has(item.name)) continue // We want to hold this item
                        await friend.sendItem(bot.id, i, item.q)
                    }
                }

                // Return so we can deal with a full inventory if we need to
                return
            }

            // TODO: Go fishing if we have a fishing rod

            // TODO: Go mining if we have a pick axe

            // TODO: Upgrade items for our characters if they don't have anything equipped, or it's a low level
            const LEVEL_TO_UPGRADE_TO = 8
            const NUM_TO_BUY = 1

            // Find the lowest level item across all characters
            let lowestItemSlot: SlotType
            let lowestItemLevel: number = Number.MAX_SAFE_INTEGER
            let getFor: Character
            itemSearch:
            for (const friendContext of friendContexts) {
                const friend = friendContext.bot
                for (const sN in friend.slots) {
                    const slotName = sN as SlotType
                    if (slotName.startsWith("trade")) continue // Don't look at trade slots
                    if (!(["chest", "gloves", "helmet", "mainhand", "pants", "shoes"]).includes(slotName)) continue
                    const slot = friend.slots[slotName]
                    if (!slot) {
                        // We have nothing in this slot, let's get something for it
                        lowestItemSlot = slotName
                        lowestItemLevel = 0
                        getFor = friend
                        break itemSearch
                    }
                    if (slot.level > LEVEL_TO_UPGRADE_TO) continue // We already have something pretty good
                    if (slot.level >= lowestItemLevel) continue // We have already found something at a lower level

                    // We found a new low
                    lowestItemLevel = slot.level
                    lowestItemSlot = slotName
                    getFor = friend
                }
            }

            // Buy and upgrade the store-level item to a higher level to replace it
            if (lowestItemSlot) {
                let item: ItemName
                switch (lowestItemSlot) {
                    case "chest":
                        item = "coat"
                        break
                    case "gloves":
                        item = "gloves"
                        break
                    case "helmet":
                        item = "helmet"
                        break
                    case "mainhand":
                        // Get the item that will attack the fastest
                        switch (getFor.ctype) {
                            case "mage":
                                item = "wand"
                                break
                            case "paladin":
                                item = "mace"
                                break
                            case "priest":
                                item = "wand"
                                break
                            case "ranger":
                                item = "bow"
                                break
                            case "rogue":
                                item = "blade"
                                break
                            case "warrior":
                                item = "claw"
                                break
                        }
                        break
                    case "pants":
                        item = "pants"
                        break
                    case "shoes":
                        item = "shoes"
                        break
                }

                // If we have a higher level item, make sure it has the correct scroll and go deliver and equip it
                const potential = bot.locateItem(item, bot.items, { levelGreaterThan: lowestItemLevel, returnHighestLevel: true })
                const potentialData = bot.items[potential]
                if (potential !== undefined) {
                    // We have something to give them
                    console.log(`[${bot.id}] We have a ${item} for ${getFor.id} (${lowestItemLevel} => ${potentialData.level})!`)

                    // Apply the correct stat scroll if we need
                    const itemData = bot.items[potential]
                    const stat = AL.Game.G.items[item].stat ? AL.Game.G.classes[getFor.ctype].main_stat : undefined
                    if (itemData.stat_type !== stat) {
                        console.log(`[${bot.id}] Going to apply ${stat} scroll to ${item}.`)

                        // Go to the upgrade NPC
                        if (!bot.hasItem("computer") && !bot.hasItem("supercomputer")) {
                            await bot.smartMove("newupgrade", { getWithin: 25 })
                        }

                        // Buy the correct stat scroll(s) and apply them
                        const grade = bot.calculateItemGrade(itemData)
                        const statScroll = `${stat}scroll` as ItemName
                        const numNeeded = Math.pow((grade + 1), 10)
                        const numHave = bot.countItem(statScroll, bot.items)

                        try {
                            await bot.buy(statScroll, numNeeded - numHave)
                            const statScrollPosition = bot.locateItem(statScroll)
                            await bot.upgrade(potential, statScrollPosition)
                        } catch (e) {
                            console.error(e)
                        }
                    }

                    const potentialWithScroll = bot.locateItem(item, bot.items, { levelGreaterThan: lowestItemLevel, returnHighestLevel: true, statType: stat })
                    if (potentialWithScroll !== undefined) {
                        console.log(`[${bot.id}] Delivering ${item} to ${getFor.id}!`)
                        await bot.smartMove(getFor, { getWithin: 25 })
                        if (AL.Tools.squaredDistance(bot, getFor) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                            // We're not near them, so they must have moved, return so we can try again next loop
                            return
                        }

                        // Send it and equip it
                        await bot.sendItem(getFor.id, potentialWithScroll)
                        await sleep(1000)
                        const equipItem = getFor.locateItem(item, getFor.items, { levelGreaterThan: lowestItemLevel, returnHighestLevel: true, statType: stat })
                        await getFor.equip(equipItem)

                        // Send the old item back to the merchant
                        await getFor.sendItem(bot.id, equipItem)
                    }
                }

                console.log(`[${bot.id}] Going to upgrade ${item} for ${getFor.id}!`)

                const numItems = bot.countItem(item)
                if (numItems < NUM_TO_BUY) {
                    // Go to bank and see if we have any
                    await bot.smartMove(bankingPosition)
                    const freeSlots = getUnimportantInventorySlots(bot, ITEMS_TO_HOLD_MERCHANT)
                    for (const bP in bot.bank) {
                        if (bP == "gold") continue
                        const bankPackNum = Number.parseInt(bP.substring(5, 7))
                        if (bankPackNum > 7) continue
                        const bankPack = bP as BankPackName
                        const bankItems = bot.bank[bankPack]
                        for (let i = 0; i < bankItems.length; i++) {
                            const bankItem = bankItems[i]
                            if (!bankItem) continue
                            if (bankItem.name !== item) continue
                            await bot.withdrawItem(bankPack, i, freeSlots.pop())
                            if (bot.esize < 2) break // Limited space in inventory
                        }
                    }
                }

                // Go to the upgrade NPC
                if (!bot.hasItem("computer") && !bot.hasItem("supercomputer")) {
                    await bot.smartMove("newupgrade", { getWithin: 25 })
                }

                // Buy if we need
                while (bot.canBuy(item) && bot.countItem(item) < NUM_TO_BUY) {
                    await bot.buy(item)
                }

                // Find the lowest level item, we'll upgrade that one
                const lowestLevelPosition = bot.locateItem(item, bot.items, { returnLowestLevel: true })
                if (lowestLevelPosition == undefined) return // We probably couldn't afford to buy one
                const lowestLevel = bot.items[lowestLevelPosition].level

                // Don't upgrade if it's already the level we want
                if (lowestLevel < lowestItemLevel + 1) {
                    /** Find the scroll that corresponds with the grade of the item */
                    const grade = bot.calculateItemGrade(bot.items[lowestLevelPosition])
                    const scroll = `scroll${grade}` as ItemName

                    /** Buy a scroll if we don't have one */
                    let scrollPosition = bot.locateItem(scroll)
                    if (scrollPosition == undefined && bot.canBuy(scroll)) {
                        console.log(`[${bot.id}] Buying scroll for ${item} for ${getFor.id}!`)

                        await bot.buy(scroll)
                        scrollPosition = bot.locateItem(scroll)
                    }

                    if (scrollPosition !== undefined) {
                        console.log(`[${bot.id}] Upgrading ${item} for ${getFor.id}!`)

                        /** Speed up the upgrade if we can */
                        if (bot.canUse("massproduction")) await bot.massProduction()

                        /** Upgrade! */
                        await bot.upgrade(lowestLevelPosition, scrollPosition)
                        return
                    }
                }
            }

            // Go to town and wait for things to do
            await bot.smartMove("main")
        } catch (e) {
            console.error(e)
        }
    }
}

// Strategies
const baseStrategy = new BaseStrategy(CONTEXTS)
const merchantMoveStrategy = new LulzMerchantMoveStrategy(CONTEXTS, { replenishRatio: 0.5 })
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
            context.applyStrategy(new MageAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters, "phoenix"] }))
            break
        }
        case "priest": {
            context.applyStrategy(new PriestAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters, "phoenix"] }))
            break
        }
        case "ranger": {
            context.applyStrategy(new RangerAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters, "phoenix"] }))
            break
        }
        case "warrior": {
            context.applyStrategy(new WarriorAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters, "phoenix"] }))
            break
        }
        default: {
            context.applyStrategy(new BaseAttackStrategy({ contexts: CONTEXTS, typeList: [...monsters, "phoenix"] }))
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
            if (((!context.bot.hasItem("hpot1") || !context.bot.hasItem("mpot1")) && context.bot.gold > (AL.Game.G.items.mpot1.g * 100)) || context.bot.isFull()) {
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
                    const mageMonsters: MonsterName[] = ["armadillo", "bee", "crab", "goo"]
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
                    const rangerMonsters: MonsterName[] = ["armadillo", "bee", "crab", "goo"]
                    if (!rangerMonsters.includes(monster)) {
                        return res.status(400).send(`This service doesn't currently support ${monster} for ${charType}, sorry!`)
                    }
                    break
                }
                case "warrior": {
                    const warriorMonsters: MonsterName[] = ["bee", "crab", "goo"]
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