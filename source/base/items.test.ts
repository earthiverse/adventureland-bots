import { jest } from "@jest/globals"
import AL from "alclient"
import { DEFAULT_ITEM_CONFIG, ItemConfig, adjustItemConfig, runSanityCheckOnItemConfig } from "./itemsNew.js"

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