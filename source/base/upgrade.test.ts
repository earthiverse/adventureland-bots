import fs from "fs"
import { jest } from "@jest/globals"
import AL, { type Character, type GData, type ItemName } from "alclient"
import {
    calculateCompoundChance,
    calculateOptimalCompoundPath,
    calculateOptimalUpgradePath,
    calculateUpgradeChance,
    getNextUpgradeAction,
    getScrollAndOfferingPricesFromG,
} from "./upgrade.js"

beforeAll(async () => {
    try {
        await AL.Game.getGData(true, false)
    } catch (error) {
        const cachedG = fs
            .readdirSync(process.cwd())
            .filter((file) => /^G_\d+\.json$/.test(file))
            .sort((a, b) => Number.parseInt(a.slice(2), 10) - Number.parseInt(b.slice(2), 10))
            .pop()
        if (!cachedG) throw error
        AL.Game.G = JSON.parse(fs.readFileSync(cachedG, "utf8")) as GData
    }
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

test("calculateOptimalUpgradePath uses stat scroll with prim stacking on stat items", async () => {
    const path = calculateOptimalUpgradePath({ name: "horsecapeg", level: 0 }, 10_000_000, AL.Game.G, 10)
    expect(path).toBeDefined()

    let hasStatStackStep = false
    for (let i = 1; i < path!.length; i++) {
        if (path![i]!.level === path![i - 1]!.level && path![i]!.scroll === "strscroll") {
            hasStatStackStep = true
            expect(path![i]!.offering).toBe("offeringp")
            expect(Math.round((path![i]!.grace - path![i - 1]!.grace) * 10) / 10).toBe(1)
        }
    }
    expect(hasStatStackStep).toBeTruthy()

    const mockBot: any = {
        G: AL.Game.G,
        items: [{ name: "horsecapeg", level: 6 }],
        locateItem: () => 1,
        calculateUpgrade: async () => ({ grace: 0.2 }),
    }
    const stackWithStrScroll = await getNextUpgradeAction(mockBot, 0, { buyPrice: 10_000_000 })
    expect(stackWithStrScroll).toEqual({
        action: "stack",
        scroll: "strscroll",
        offering: "offeringp",
    })
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

test("queries live grace with offeringp when no matching upgrade scroll is held", async () => {
    const calculateUpgrade = jest.fn<() => Promise<{ grace: number }>>()
    const mockBot = {
        G: AL.Game.G,
        items: [{ name: "xarmor", level: 8 }],
        locateItem: (name: ItemName) => (name === "offeringp" ? 5 : undefined),
        calculateUpgrade,
    } as unknown as Character

    calculateUpgrade.mockResolvedValueOnce({ grace: 0 })
    const stackAction = await getNextUpgradeAction(mockBot, 0, { buyPrice: 15_000_000 })
    expect(calculateUpgrade).toHaveBeenLastCalledWith(0, undefined, 5)
    expect(stackAction).toEqual({
        action: "stack",
        scroll: undefined,
        offering: "offeringp",
    })

    calculateUpgrade.mockResolvedValueOnce({ grace: 159.5 })
    const upgradeAction = await getNextUpgradeAction(mockBot, 0, { buyPrice: 15_000_000 })
    expect(calculateUpgrade).toHaveBeenLastCalledWith(0, undefined, 5)
    expect(upgradeAction?.action).toBe("upgrade")
    expect(upgradeAction?.scroll).toBe("scroll3")
})

test("returns undefined when required live grace cannot be checked", async () => {
    const noProbeBot = {
        G: AL.Game.G,
        items: [{ name: "xarmor", level: 8 }],
        locateItem: () => undefined,
        calculateUpgrade: jest.fn(),
    } as unknown as Character
    await expect(getNextUpgradeAction(noProbeBot, 0, { buyPrice: 15_000_000 })).resolves.toBeUndefined()

    const failingBot = {
        G: AL.Game.G,
        items: [{ name: "xarmor", level: 8 }],
        locateItem: (name: ItemName) => (name === "offeringp" ? 5 : undefined),
        calculateUpgrade: jest.fn<() => Promise<{ grace: number }>>().mockRejectedValue(new Error("timeout")),
    } as unknown as Character
    await expect(getNextUpgradeAction(failingBot, 0, { buyPrice: 15_000_000 })).resolves.toBeUndefined()

    const nonFiniteGraceBot = {
        G: AL.Game.G,
        items: [{ name: "xarmor", level: 8 }],
        locateItem: (name: ItemName) => (name === "offeringp" ? 5 : undefined),
        calculateUpgrade: jest.fn<() => Promise<{ grace: number }>>().mockResolvedValue({ grace: Number.NaN }),
    } as unknown as Character
    await expect(getNextUpgradeAction(nonFiniteGraceBot, 0, { buyPrice: 15_000_000 })).resolves.toBeUndefined()
})

test("skips calculateUpgrade when planned upgrade requires zero grace", async () => {
    const calculateUpgrade = jest.fn()
    const mockBot = {
        G: AL.Game.G,
        items: [{ name: "bataxe", level: 0 }],
        locateItem: () => undefined,
        calculateUpgrade,
    } as unknown as Character

    const action = await getNextUpgradeAction(mockBot, 0, { buyPrice: 6_000_000 })
    expect(action?.action).toBe("upgrade")
    expect(calculateUpgrade).not.toHaveBeenCalled()
})
