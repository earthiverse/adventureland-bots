import { jest } from "@jest/globals"
import AL, { Item, Merchant, Priest } from "alclient"
import {
    DEFAULT_ITEM_CONFIG,
    ItemConfig,
    type ItemCounts,
    type LevelCounts,
    adjustItemConfig,
    runSanityCheckOnItemConfig,
    wantToSellToNpc,
    wantToSellToPlayer,
} from "./itemsNew.js"
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
        brownegg: {
            buy: true,
            buyPrice: 5_000_000,
            sell: true,
            sellPrice: 1_000_000,
        },
        // Ponty is more than NPC
        platinumnugget: {
            buy: true,
            buyPrice: "ponty",
            sell: true,
            sellPrice: "npc",
        },
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
        vhammer: {
            sell: true,
            sellPrice: 100_000_000,
        },
        // Stackable
        monstertoken: {
            sell: true,
            sellPrice: 250_000,
        },
    }

    const bot = new Priest("", "", "", AL.Game.G, {
        region: "ASIA",
        name: "I",
        address: "test",
        path: "/test",
        players: 0,
        key: "ASIAI",
    })

    const vhammerInventory = new Item({ name: "vhammer", level: 0 }, AL.Game.G)
    // We shouldn't want to sell it to an NPC
    expect(wantToSellToNpc(itemConfig, vhammerInventory, bot)).toBeFalsy()
    // We shouldn't want to sell it at a low price
    for (const price of [1, 99_999_999]) {
        const pricedTooLow = new TradeItem({ name: "vhammer", b: true, level: 0, price: price, rid: "" }, AL.Game.G)
        expect(wantToSellToPlayer(itemConfig, pricedTooLow)).toBeFalsy()
    }
    // We should want to sell it at a high enough price
    for (const price of [100_000_000, 999_999_999]) {
        const pricedOkay = new TradeItem({ name: "vhammer", b: true, level: 0, price: price, rid: "" }, AL.Game.G)
        expect(wantToSellToPlayer(itemConfig, pricedOkay)).toBeTruthy()
    }

    const monsterTokenInventory = new Item({ name: "monstertoken", q: 10 }, AL.Game.G)
    // We shouldn't want to sell it to an NPC
    expect(wantToSellToNpc(itemConfig, monsterTokenInventory, bot)).toBeFalsy()
    // We shouldn't want to sell it at a low price
    for (const price of [1, 50_000, 150_000]) {
        const pricedTooLow = new TradeItem({ name: "monstertoken", b: true, q: 9999, price: price, rid: "" }, AL.Game.G)
        expect(wantToSellToPlayer(itemConfig, pricedTooLow)).toBeFalsy()
    }
    // We should want to sell it at a high enough price
    for (const price of [250_000, 500_000, 999_999_999]) {
        const pricedOkay = new TradeItem({ name: "monstertoken", b: true, q: 9999, price: price, rid: "" }, AL.Game.G)
        expect(wantToSellToPlayer(itemConfig, pricedOkay)).toBeTruthy()
    }
})

test("warns when hold: true is combined with sellExcess", async () => {
    const warn = console.warn
    const warnMock = jest.fn()
    console.warn = warnMock

    try {
        const itemConfig: ItemConfig = {
            pumpkinspice: {
                hold: ["mage", "paladin", "priest", "ranger", "rogue", "warrior"],
                sellExcess: 9999 * 3,
            },
            smoke: {
                hold: true,
                sellExcess: 200,
            },
        }

        await runSanityCheckOnItemConfig(itemConfig)

        expect(warnMock).toHaveBeenCalledTimes(1)
        expect(itemConfig.smoke?.sellExcess).toBeUndefined()
        expect(itemConfig.pumpkinspice?.sellExcess).toBe(9999 * 3)
    } finally {
        console.warn = warn
    }
})

test("sells excess pumpkinspice for merchant but holds for attackers", () => {
    const serverData = {
        region: "ASIA" as const,
        name: "I" as const,
        address: "test",
        path: "/test",
        players: 0,
        key: "ASIAI",
    }
    const merchant = new Merchant("", "", "", AL.Game.G, serverData)
    const priest = new Priest("", "", "", AL.Game.G, serverData)
    const pumpkinspice = new Item({ name: "pumpkinspice", q: 9999 }, AL.Game.G)

    const atLimitLevelCounts: LevelCounts = new Map<number | undefined, { q: number; inventorySpaces: number }>([
        [undefined, { q: 9999 * 3, inventorySpaces: 3 }],
    ])
    const atLimit: ItemCounts = new Map([["pumpkinspice", atLimitLevelCounts]])
    expect(wantToSellToNpc(DEFAULT_ITEM_CONFIG, pumpkinspice, merchant, atLimit)).toBe(false)
    expect(wantToSellToNpc(DEFAULT_ITEM_CONFIG, pumpkinspice, priest, atLimit)).toBe(false)

    const overLimitLevelCounts: LevelCounts = new Map<number | undefined, { q: number; inventorySpaces: number }>([
        [undefined, { q: 9999 * 3 + 1, inventorySpaces: 4 }],
    ])
    const overLimit: ItemCounts = new Map([["pumpkinspice", overLimitLevelCounts]])
    expect(wantToSellToNpc(DEFAULT_ITEM_CONFIG, pumpkinspice, merchant, overLimit)).toBe(true)
    expect(wantToSellToNpc(DEFAULT_ITEM_CONFIG, pumpkinspice, priest, overLimit)).toBe(false)
})
