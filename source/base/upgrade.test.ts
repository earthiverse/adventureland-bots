import AL from "alclient"
import {
    calculateCompoundChance,
    calculateOptimalCompoundPath,
    calculateOptimalUpgradePath,
    calculateUpgradeChance,
    getNextUpgradeAction,
    getScrollAndOfferingPricesFromG,
} from "./upgrade.js"

beforeAll(async () => {
    await AL.Game.getGData(true, false)
    getScrollAndOfferingPricesFromG(AL.Game.G)
}, 60_000)

test("calculateUpgradeChance works as expected", () => {
    const res = calculateUpgradeChance({ name: "bow", level: 0 }, 0, "scroll0", AL.Game.G)
    expect(res.chance).toBeGreaterThan(0.9)
    expect(res.newGrace).toBeDefined()
})

test("calculateCompoundChance works as expected", () => {
    const res = calculateCompoundChance({ name: "ringsj", level: 0 }, 0, "cscroll0", AL.Game.G)
    expect(res.chance).toBeGreaterThan(0.9)
    expect(res.newGrace).toBeDefined()
})

test("calculateOptimalUpgradePath computes valid paths with prim stacking", () => {
    const path = calculateOptimalUpgradePath({ name: "bataxe", level: 0 }, 6_000_000, AL.Game.G, 10)
    expect(path).toBeDefined()
    expect(path!.length).toBeGreaterThan(0)
    expect(path![path!.length - 1]?.level).toBe(10)

    let hasStackStep = false
    for (let i = 1; i < path!.length; i++) {
        expect(path![i]!.cost).toBeGreaterThan(path![i - 1]!.cost)
        expect(path![i]!.grace).toBeGreaterThanOrEqual(path![i - 1]!.grace)
        expect(path![i]!.level).toBeGreaterThanOrEqual(path![i - 1]!.level)
        if (path![i]!.level === path![i - 1]!.level) {
            hasStackStep = true
            expect(path![i]!.scroll).toBeUndefined()
            expect(path![i]!.offering).toBe("offeringp")
        }
    }
    // High-value item upgrading to level 10 should benefit from prim stacking
    expect(hasStackStep).toBeTruthy()
})

test("debug upgrade path and getNextUpgradeAction", async () => {
    const bataxePath = calculateOptimalUpgradePath({ name: "bataxe", level: 0 }, 6_000_000, AL.Game.G, 10)
    console.log("Bataxe path:", bataxePath)

    const mockBot: any = {
        G: AL.Game.G,
        items: [{ name: "bataxe", level: 0 }],
        locateItem: () => undefined,
        calculateUpgrade: async () => ({ grace: 0 }),
    }
    const action0 = await getNextUpgradeAction(mockBot, 0)
    console.log("Action at level 0:", action0)

    mockBot.items[0].level = 7
    const action7 = await getNextUpgradeAction(mockBot, 0)
    console.log("Action at level 7:", action7)

    mockBot.items[0].level = 8
    const action8 = await getNextUpgradeAction(mockBot, 0)
    console.log("Action at level 8:", action8)

    console.log(
        "horsecapeg level 8 path:",
        calculateOptimalUpgradePath({ name: "horsecapeg", level: 8 }, 10_000_000, AL.Game.G, 10),
    )
    console.log(
        "mshield level 8 path:",
        calculateOptimalUpgradePath({ name: "mshield", level: 8 }, 20_000_000, AL.Game.G, 10),
    )
    console.log(
        "ornamentstaff level 9 path:",
        calculateOptimalUpgradePath({ name: "ornamentstaff", level: 9 }, 5_000_000, AL.Game.G, 10),
    )
})

test("calculateOptimalCompoundPath computes valid compound paths", () => {
    const path = calculateOptimalCompoundPath({ name: "ringsj", level: 0 }, AL.Game.G.items.ringsj.g, AL.Game.G, 6)
    expect(path).toBeDefined()
    expect(path!.length).toBeGreaterThan(0)
    expect(path![path!.length - 1]?.level).toBe(6)

    for (let i = 1; i < path!.length; i++) {
        expect(path![i]!.cost).toBeGreaterThan(path![i - 1]!.cost)
        expect(path![i]!.level).toBeGreaterThan(path![i - 1]!.level)
    }
})
