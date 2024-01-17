import AL, { ItemName, MonsterName, ServerData, ServerRegion } from "alclient"
import { RunnerOptions, startCharacterFromName, startRunner } from "./strategy_pattern/runner.js"
import { DEFAULT_ITEMS_TO_HOLD } from "./base/defaults.js"

const MONSTER: MonsterName = "crab"
const CREDENTIALS = "../credentials.battleau.json"

AL.Game.setServer("https://battle.au")

await Promise.all([AL.Game.loginJSONFile(CREDENTIALS, true), AL.Game.getGData(false)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: false })

// Hack to fix URLs
for (const region in AL.Game.servers) {
    for (const id in AL.Game.servers[region]) {
        AL.Game.servers[region][id].addr = AL.Game.servers[region][id].addr.replace('aud1.', '')
    }
}

// Add a whole bunch of items to the sell list
const SELL_MAP: Map<ItemName, [number, number][]> = new Map([
    ["wbreeches", undefined],
    ["hpamulet", undefined],
    ["hpbelt", undefined],
    ["stinger", undefined],
    ["cring", undefined],
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
    startRunner(await AL.Game.startCharacter(character, "US", "I"), options)
}

for (const character of ["earthRog"]) {
    startRunner(await AL.Game.startCharacter(character, "AU" as ServerRegion, "I"), options)
}
