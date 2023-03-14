import AL, { Merchant, ServerIdentifier, ServerRegion, TradeSlotType } from "alclient"
import { getMsToNextMinute } from "../base/general.js"
import { MERCHANT_ITEMS_TO_HOLD } from "../archive/base/merchant.js"
import { Strategist } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { DEFAULT_ITEMS_TO_BUY, startMerchant } from "./strategy.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

const BUFFER = 10_000
const MERCHANT_NAME = "earthMer2"

const BASE_STRATEGY = new BaseStrategy()

let nextDefaultRegion: ServerRegion
let nextDefaultIdentifier: ServerIdentifier
function getNextDefaultServer() {
    if (nextDefaultRegion == "US") {
        if (nextDefaultIdentifier == "I") nextDefaultIdentifier = "III"
        else if (nextDefaultIdentifier == "II") nextDefaultIdentifier = "III"
        else if (nextDefaultIdentifier == "III") nextDefaultIdentifier = "PVP"
        else {
            nextDefaultRegion = "EU"
            nextDefaultIdentifier = "I"
        }
    } else if (nextDefaultRegion == "EU") {
        if (nextDefaultIdentifier == "I") nextDefaultIdentifier = "II"
        else if (nextDefaultIdentifier == "II") nextDefaultIdentifier = "PVP"
        else {
            nextDefaultRegion = "ASIA"
            nextDefaultIdentifier = "I"
        }
    } else {
        nextDefaultRegion = "US"
        nextDefaultIdentifier = "I"
    }
    return { serverRegion: nextDefaultRegion, serverIdentifier: nextDefaultIdentifier }
}

async function start(serverRegion: ServerRegion, serverIdentifier: ServerIdentifier) {
    // Set up the next check for deals
    setTimeout(checkDeals, getMsToNextMinute() + BUFFER)

    const merchant = await AL.Game.startMerchant(MERCHANT_NAME, serverRegion, serverIdentifier)
    const context = new Strategist<Merchant>(merchant, BASE_STRATEGY)
    await startMerchant(context, [], {
        defaultPosition: { map: "main", x: 100, y: 0 },
        enableDealFinder: {
            itemsToBuy: DEFAULT_ITEMS_TO_BUY
        },
        enableJoinGiveaways: true,
        goldToHold: 500_000_000,
        itemsToHold: MERCHANT_ITEMS_TO_HOLD
    })

    // Set up the disconnect for the next server hop
    setTimeout(()=> {
        console.log("Stopping!")
        context.stop()
    }, getMsToNextMinute() - BUFFER)
}

async function checkDeals() {
    // Check what server our merchants are on, and avoid those servers
    await AL.Game.updateServersAndCharacters()
    const online = new Set<string>()
    for (const charName in AL.Game.characters) {
        const charData = AL.Game.characters[charName]
        if (!charData.online) continue // Not online
        if (charData.type !== "merchant") continue // Not a merchant
        online.add(charData.server)
    }
    const avoidServers = [...online]
        // Return a formatted list of servers to not check
        .map((v) => {
            const server = /(US|EU|ASIA)(I|II|III|PVP)/.exec(v)
            const serverRegion: ServerRegion = server[1] as ServerRegion
            const serverIdentifier: ServerIdentifier = server[2] as ServerIdentifier
            return { serverRegion: serverRegion, serverIdentifier: serverIdentifier }
        })
    if (avoidServers.length === 0)
        // Use a non-existent server so Mongo doesn't yell at us for avoidServers being empty
        avoidServers.push({ serverRegion: "ASIA", serverIdentifier: "III" })

    // Look for giveaways
    const giveawayMerchants = await AL.PlayerModel.find({
        lastSeen: { $gt: Date.now() - 120000 },
        $or: [
            { "slots.trade1.giveaway": true, "slots.trade1.list": { $ne: MERCHANT_NAME } },
            { "slots.trade2.giveaway": true, "slots.trade2.list": { $ne: MERCHANT_NAME } },
            { "slots.trade3.giveaway": true, "slots.trade3.list": { $ne: MERCHANT_NAME } },
            { "slots.trade4.giveaway": true, "slots.trade4.list": { $ne: MERCHANT_NAME } },
            { "slots.trade5.giveaway": true, "slots.trade5.list": { $ne: MERCHANT_NAME } },
            { "slots.trade6.giveaway": true, "slots.trade6.list": { $ne: MERCHANT_NAME } },
            { "slots.trade7.giveaway": true, "slots.trade7.list": { $ne: MERCHANT_NAME } },
            { "slots.trade8.giveaway": true, "slots.trade8.list": { $ne: MERCHANT_NAME } },
            { "slots.trade9.giveaway": true, "slots.trade9.list": { $ne: MERCHANT_NAME } },
            { "slots.trade10.giveaway": true, "slots.trade10.list": { $ne: MERCHANT_NAME } },
            { "slots.trade11.giveaway": true, "slots.trade11.list": { $ne: MERCHANT_NAME } },
            { "slots.trade12.giveaway": true, "slots.trade12.list": { $ne: MERCHANT_NAME } },
            { "slots.trade13.giveaway": true, "slots.trade13.list": { $ne: MERCHANT_NAME } },
            { "slots.trade14.giveaway": true, "slots.trade14.list": { $ne: MERCHANT_NAME } },
            { "slots.trade15.giveaway": true, "slots.trade15.list": { $ne: MERCHANT_NAME } },
            { "slots.trade16.giveaway": true, "slots.trade16.list": { $ne: MERCHANT_NAME } },
            { "slots.trade17.giveaway": true, "slots.trade17.list": { $ne: MERCHANT_NAME } },
            { "slots.trade18.giveaway": true, "slots.trade18.list": { $ne: MERCHANT_NAME } },
            { "slots.trade19.giveaway": true, "slots.trade19.list": { $ne: MERCHANT_NAME } },
            { "slots.trade20.giveaway": true, "slots.trade20.list": { $ne: MERCHANT_NAME } },
            { "slots.trade21.giveaway": true, "slots.trade21.list": { $ne: MERCHANT_NAME } },
            { "slots.trade22.giveaway": true, "slots.trade22.list": { $ne: MERCHANT_NAME } },
            { "slots.trade23.giveaway": true, "slots.trade23.list": { $ne: MERCHANT_NAME } },
            { "slots.trade24.giveaway": true, "slots.trade24.list": { $ne: MERCHANT_NAME } },
            { "slots.trade25.giveaway": true, "slots.trade25.list": { $ne: MERCHANT_NAME } },
            { "slots.trade26.giveaway": true, "slots.trade26.list": { $ne: MERCHANT_NAME } },
            { "slots.trade27.giveaway": true, "slots.trade27.list": { $ne: MERCHANT_NAME } },
            { "slots.trade28.giveaway": true, "slots.trade28.list": { $ne: MERCHANT_NAME } },
            { "slots.trade29.giveaway": true, "slots.trade29.list": { $ne: MERCHANT_NAME } },
            { "slots.trade30.giveaway": true, "slots.trade30.list": { $ne: MERCHANT_NAME } },
        ],
        $nor: avoidServers
    }).lean().exec()

    if (giveawayMerchants.length > 0) {
        const target = giveawayMerchants[0]
        console.log(`Going to ${target.serverRegion}${target.serverIdentifier} to look for a giveaway on ${target.name}!`)
        start(target.serverRegion, target.serverIdentifier)
        return
    }

    // Look for Ponty deals
    const itemsToCheckPonty = [...DEFAULT_ITEMS_TO_BUY.entries()]
        // Only include items we want to buy at Ponty prices
        .filter(([name, price]) => (
            (price >= AL.Game.G.items[name].g * AL.Constants.PONTY_MARKUP)
            || (price <= -AL.Constants.PONTY_MARKUP)
        ))
        // Only return item names
        .map((v) => v[0])

    const ponty = await AL.NPCModel.findOne({
        lastSeen: { $gt: Date.now() - 120000 },
        items: { $elemMatch: { name: { $in: itemsToCheckPonty } } },
        $nor: avoidServers
    }).lean().exec()

    if (ponty) {
        console.log(`Going to ${ponty.serverRegion}${ponty.serverIdentifier} to look at Ponty!`)
        start(ponty.serverRegion, ponty.serverIdentifier)
        return
    }

    const buyMerchants = await AL.PlayerModel.find({
        lastSeen: { $gt: Date.now() - 120000 },
        $or: [
            { "slots.trade1": { $ne: undefined } },
            { "slots.trade2": { $ne: undefined } },
            { "slots.trade3": { $ne: undefined } },
            { "slots.trade4": { $ne: undefined } },
            { "slots.trade5": { $ne: undefined } },
            { "slots.trade6": { $ne: undefined } },
            { "slots.trade7": { $ne: undefined } },
            { "slots.trade8": { $ne: undefined } },
            { "slots.trade9": { $ne: undefined } },
            { "slots.trade10": { $ne: undefined } },
            { "slots.trade11": { $ne: undefined } },
            { "slots.trade12": { $ne: undefined } },
            { "slots.trade13": { $ne: undefined } },
            { "slots.trade14": { $ne: undefined } },
            { "slots.trade15": { $ne: undefined } },
            { "slots.trade16": { $ne: undefined } },
            { "slots.trade17": { $ne: undefined } },
            { "slots.trade18": { $ne: undefined } },
            { "slots.trade19": { $ne: undefined } },
            { "slots.trade20": { $ne: undefined } },
            { "slots.trade21": { $ne: undefined } },
            { "slots.trade22": { $ne: undefined } },
            { "slots.trade23": { $ne: undefined } },
            { "slots.trade24": { $ne: undefined } },
            { "slots.trade25": { $ne: undefined } },
            { "slots.trade26": { $ne: undefined } },
            { "slots.trade27": { $ne: undefined } },
            { "slots.trade28": { $ne: undefined } },
            { "slots.trade29": { $ne: undefined } },
            { "slots.trade30": { $ne: undefined } },
        ],
        $nor: avoidServers
    }).lean().exec()
    const merchantsToCheck = buyMerchants
        .filter((v) => {
            for (const slotName in v.slots) {
                const slotData = v.slots[slotName as TradeSlotType]
                if (!slotData) continue // No data
                if (!slotData.price) continue // Not a trade slot
                if (slotData.b) continue // Buying, not selling
                let priceToPay = DEFAULT_ITEMS_TO_BUY.get(slotData.name)
                if (priceToPay < 0) priceToPay = AL.Game.G.items[slotData.name].g * -priceToPay
                if (!priceToPay || slotData.price > priceToPay) continue // Not on our wishlist, or more than we want to pay

                // There's something we want from this merchant
                return true
            }
        })

    if (merchantsToCheck.length > 0) {
        const target = merchantsToCheck[0]
        console.log(`Going to ${target.serverRegion}${target.serverIdentifier} to look for an item on ${target.name}!`)
        start(target.serverRegion, target.serverIdentifier)
        return
    }

    for (let i = 0; i < 5; i++) {
        const nextServer = getNextDefaultServer()
        if (avoidServers.some((v) => v.serverRegion == nextServer.serverRegion && v.serverIdentifier == nextServer.serverIdentifier)) {
            // We want to avoid this server
            continue
        }
        console.log(`Going to ${nextServer.serverRegion}${nextServer.serverIdentifier} to see what's what!`)
        start(nextServer.serverRegion, nextServer.serverIdentifier)
        return
    }

    console.log("Not going anywhere for now...")
    setTimeout(checkDeals, getMsToNextMinute() + BUFFER)
    return
}

setTimeout(checkDeals, getMsToNextMinute() + BUFFER)