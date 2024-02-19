import AL, { MonsterName, ServerRegion } from "alclient"
import { RunnerOptions, startRunner } from "./strategy_pattern/runner.js"
import { DEFAULT_ITEMS_TO_HOLD } from "./base/defaults.js"
import { ItemConfig } from "./base/itemsNew.js"

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

const ITEM_CONFIG: ItemConfig = {
    "cring": {
        sell: true,
        sellPrice: "npc"
    },
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

for (const character of ["earthiverse", "earthMag", "earthPri", "earthMer"]) {
    startRunner(await AL.Game.startCharacter(character, "US", "I"), options)
}

for (const character of ["earthRog"]) {
    startRunner(await AL.Game.startCharacter(character, "AU" as ServerRegion, "I"), options)
}
