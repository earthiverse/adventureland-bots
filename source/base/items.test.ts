import { jest } from "@jest/globals"
import AL, { Item, Priest } from "alclient"
import { DEFAULT_ITEM_CONFIG, ItemConfig, adjustItemConfig, runSanityCheckOnItemConfig, wantToSellToNpc, wantToSellToPlayer } from "./itemsNew.js"
import { TradeItem } from "alclient/build/TradeItem.js"

beforeAll(async () => {
    await AL.Game.getGData(true, false)
}, 60_000)

test("No warnings when running sanity check on default item config", async () => {
    // Replace log with mock
    const warn = console.warn
    const warnMock = jest.fn()
    console.warn = warnMock

    // Run the sanity check on the default config
    await runSanityCheckOnItemConfig(DEFAULT_ITEM_CONFIG)

    // Run the sanity check on the adjusted item config
    const adjustedItemConfig = { ...DEFAULT_ITEM_CONFIG }
    await adjustItemConfig(adjustedItemConfig)

    // Run the sanity check again
    await runSanityCheckOnItemConfig(adjustedItemConfig)

    // Make sure there were no warnings
    expect(warnMock).not.toHaveBeenCalled()

    // Set log back to normal
    console.warn = warn
})

test("Warning when buyPrice > sellPrice (buyPrice and sellPrice are numbers)", async () => {
    // Replace log with mock
    const warn = console.warn
    const warnMock = jest.fn()
    console.warn = warnMock

    const itemConfig: ItemConfig = {
        "brownegg": {
            buy: true,
            buyPrice: 5_000_000,
            sell: true,
            sellPrice: 1_000_000
        },
        // Ponty is more than NPC
        "platinumnugget": {
            buy: true,
            buyPrice: "ponty",
            sell: true,
            sellPrice: "npc"
        }
    }

    // Run the sanity check on the default config
    await runSanityCheckOnItemConfig(itemConfig)

    // Make sure there was a warning
    expect(warnMock).toHaveBeenCalledTimes(2)

    // Set log back to normal
    console.warn = warn
})

test("wantToSell works as expected", () => {
    const itemConfig: ItemConfig = {
        // Not stackable
        "vhammer": {
            sell: true,
            sellPrice: 100_000_000
        },
        // Stackable
        "monstertoken": {
            sell: true,
            sellPrice: 250_000
        }
    }

    const bot = new Priest("", "", "", AL.Game.G, { region: "ASIA", name: "I", addr: "test", port: 0, players: 0, key: "ASIAI" })

    const vhammerInventory = new Item({ name: "vhammer", level: 0 }, AL.Game.G)
    // We shouldn't want to sell it to an NPC
    expect(wantToSellToNpc(itemConfig, vhammerInventory, bot)).toBeFalsy()
    // We shouldn't want to sell it at a low price
    for (const price of [1, 99_999_999]) {
        const pricedTooLow = new TradeItem({ name: "vhammer", b: true, level: 0, price: price, rid: "" }, AL.Game.G)
        expect(wantToSellToPlayer(itemConfig, pricedTooLow, bot)).toBeFalsy()
    }
    // We should want to sell it at a high enough price
    for (const price of [100_000_000, 999_999_999]) {
        const pricedOkay = new TradeItem({ name: "vhammer", b: true, level: 0, price: price, rid: "" }, AL.Game.G)
        expect(wantToSellToPlayer(itemConfig, pricedOkay, bot)).toBeTruthy()
    }

    const monsterTokenInventory = new Item({ name: "monstertoken", q: 10 }, AL.Game.G)
    // We shouldn't want to sell it to an NPC
    expect(wantToSellToNpc(itemConfig, monsterTokenInventory, bot)).toBeFalsy()
    // We shouldn't want to sell it at a low price
    for (const price of [1, 50_000, 150_000]) {
        const pricedTooLow = new TradeItem({ name: "monstertoken", b: true, q: 9999, price: price, rid: "" }, AL.Game.G)
        expect(wantToSellToPlayer(itemConfig, pricedTooLow, bot)).toBeFalsy()
    }
    // We should want to sell it at a high enough price
    for (const price of [250_000, 500_000, 999_999_999]) {
        const pricedOkay = new TradeItem({ name: "monstertoken", b: true, q: 9999, price: price, rid: "" }, AL.Game.G)
        expect(wantToSellToPlayer(itemConfig, pricedOkay, bot)).toBeTruthy()
    }
})