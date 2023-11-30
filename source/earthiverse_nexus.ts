import AL, { ItemName, MonsterName } from "alclient"
import { RunnerOptions, startCharacterFromName, startRunner } from "./strategy_pattern/runner.js"

const MONSTER: MonsterName = "crab"
const CREDENTIALS = "../credentials.nexus.json"

AL.Game.setServer("http://al.nexusnull.com")

await Promise.all([AL.Game.loginJSONFile(CREDENTIALS, false), AL.Game.getGData(true)])
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
        enableBuyAndUpgrade: {
            upgradeToLevel: 8,
        },
    },
}

for (const character of ["earthiverse", "earthRan2", "earthRan3", "earthMer"]) {
    startRunner(await startCharacterFromName(character, "US", "I"), options)
}

for (const character of ["earthPri"]) {
    startRunner(await startCharacterFromName(character, "EU", "I"), options)
}

console.log(AL.Game.characters)