import AL, { ItemName, MonsterName, ServerRegion } from "alclient"
import { RunnerOptions, startCharacterFromName, startRunner } from "./strategy_pattern/runner.js"
import { DEFAULT_ITEMS_TO_HOLD } from "./base/defaults.js"

const MONSTER: MonsterName = "crab"
const CREDENTIALS = "../credentials.battleau.json"

AL.Game.setServer("https://battle.au")

await Promise.all([AL.Game.loginJSONFile(CREDENTIALS, true), AL.Game.getGData(false)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: false })

// Add a whole bunch of items to the sell list
const SELL_MAP: Map<ItemName, [number, number][]> = new Map([
    ["wbreeches", undefined],
    ["hpamulet", undefined],
    ["hpbelt", undefined],
    ["stinger", undefined],
])

const options: RunnerOptions = {
    monster: MONSTER,
    partyLeader: "earthiverse",
    sellMap: SELL_MAP,
    merchantOverrides: {
        enableOffload: {
            esize: 35,
            goldToHold: 10_000,
            itemsToHold: DEFAULT_ITEMS_TO_HOLD
        },
        enableBuyAndUpgrade: {
            upgradeToLevel: 8,
        },
    },
}

for (const character of ["earthiverse", "earthMag", "earthPri", "earthMer"]) {
    startRunner(await startCharacterFromName(character, "US", "I"), options)
}

for (const character of ["earthRog"]) {
    startRunner(await startCharacterFromName(character, "AU" as ServerRegion, "I"), options)
}
