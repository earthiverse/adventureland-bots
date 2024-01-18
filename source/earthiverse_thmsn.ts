process.env.DEBUG="*"

import AL, { ItemName, MonsterName } from "alclient"
import { RunnerOptions, startRunner } from "./strategy_pattern/runner.js"
import { DEFAULT_ITEMS_TO_HOLD } from "./base/defaults.js"

const MONSTER: MonsterName = "goo"
const CREDENTIALS = "../credentials.thmsn.json"

AL.Game.setServer("http://thmsn.adventureland.community")

await Promise.all([AL.Game.loginJSONFile(CREDENTIALS, false), AL.Game.getGData(false)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: false })
await AL.Game.updateServersAndCharacters()

// Hack to fix URLs
for (const region in AL.Game.servers) {
    for (const id in AL.Game.servers[region]) {
        console.debug(`before: ${AL.Game.servers[region][id].addr}`)
        AL.Game.servers[region][id].addr = 'thmsn.adventureland.community'
        console.debug(`after: ${AL.Game.servers[region][id].addr}`)
    }
}

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

for (const character of ["earthiverse", "earthPri", "earthMag", "earthMer"]) {
    startRunner(await AL.Game.startCharacter(character, "EU", "I"), options)
}
