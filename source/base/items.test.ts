import { jest } from "@jest/globals"
import AL from "alclient"
import { DEFAULT_ITEM_CONFIG, runSanityCheckOnItemConfig } from "./itemsNew"

beforeAll(async () => {
    await AL.Game.getGData(true, false)
}, 60_000)

test("No warnings when running sanity check", async () => {
    // Replace log with mock
    const warn = console.warn
    const warnMock = jest.fn()
    console.warn = warnMock

    await runSanityCheckOnItemConfig(DEFAULT_ITEM_CONFIG)
    expect(warnMock).not.toHaveBeenCalled()
    
    // Set log back to normal
    console.warn = warn
})