import AL, { MonsterName } from "alclient"
import { RunnerOptions, startRunner } from "./strategy_pattern/runner.js"
import { DEFAULT_ITEMS_TO_HOLD } from "./base/defaults.js"
import { ItemConfig } from "./base/itemsNew.js"

const MONSTER: MonsterName = "crab"
const CREDENTIALS = "../credentials.nexus.json"

AL.Game.setServer("http://al.nexusnull.com")

await Promise.all([AL.Game.loginJSONFile(CREDENTIALS, false), AL.Game.getGData(false)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: false })

const ITEM_CONFIG: ItemConfig = {
    "hpamulet": {
        sell: true,
        sellPrice: "npc"
    },
    "hpbelt": {
        sell: true,
        sellPrice: "npc"
    },
    "stinger": {
        sell: true,
        sellPrice: "npc"
    },
    "wbreeches": {
        sell: true,
        sellPrice: "npc"
    }
}

const options: RunnerOptions = {
    monster: MONSTER,
    partyLeader: "earthiverse",
    itemConfig: ITEM_CONFIG,
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

for (const character of ["earthiverse", "earthRan2", "earthRan3", "earthMer"]) {
    startRunner(await AL.Game.startCharacter(character, "US", "I"), options)
}

for (const character of ["earthPri"]) {
    startRunner(await AL.Game.startCharacter(character, "EU", "I"), options)
}
