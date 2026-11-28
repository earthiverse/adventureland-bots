import { jest } from "@jest/globals"
import { type GData, type IPosition, Item, Merchant } from "alclient"
import { setLastCheck } from "../base/general.js"
import { DEFAULT_ITEM_CONFIG, type ItemCounts, type LevelCounts } from "../base/itemsNew.js"
import { mainFishingSpot, miningSpot } from "../base/locations.js"
import { NewMerchantStrategy, canSellStackToNpc, cloneItemCounts, decrementItemCount } from "./strategy.js"

const testG = {
    items: {
        bowofthedead: { g: 228_000, type: "weapon", upgrade: { attack: 6.4 } },
        broom: { g: 128, type: "weapon", upgrade: { speed: 1 }, wtype: "staff" },
        pickaxe: { g: 2_000, type: "tool", wtype: "pickaxe" },
        pumpkinspice: { g: 200, s: 9999, type: "elixir" },
        rod: { g: 2_000, type: "tool", wtype: "rod" },
        smoke: { g: 20, s: 100, type: "throw" },
        throwingstars: { g: 72_000, type: "weapon", upgrade: { attack: 2.5 } },
    },
    maps: {
        main: { safe: true },
        tunnel: { safe: true },
    },
    multipliers: {
        buy_to_sell: 0.6,
    },
    skills: {
        fishing: { class: ["merchant"], cooldown: 2_880_000, level: 1, mp: 120, wtype: "rod" },
        mining: { class: ["merchant"], cooldown: 1_440_000, level: 1, mp: 120, wtype: "pickaxe" },
    },
} as unknown as GData

const serverData = {
    region: "ASIA" as const,
    name: "I" as const,
    address: "test",
    path: "/test",
    players: 0,
    key: "ASIAI",
}

function makeMerchant(): Merchant {
    return new Merchant("", "", "", testG, serverData)
}

test("sells only stacks that keep remaining stock at or above sellExcess", () => {
    const merchant = makeMerchant()
    const levelCounts: LevelCounts = new Map<number | undefined, { q: number; inventorySpaces: number }>([
        [undefined, { q: 9999 * 3 + 50, inventorySpaces: 4 }],
    ])
    const counts: ItemCounts = new Map([["pumpkinspice", levelCounts]])

    const fullStack = new Item({ name: "pumpkinspice", q: 9999 }, testG)
    const partialStack = new Item({ name: "pumpkinspice", q: 50 }, testG)

    expect(canSellStackToNpc(DEFAULT_ITEM_CONFIG, fullStack, merchant, counts)).toBe(false)
    expect(canSellStackToNpc(DEFAULT_ITEM_CONFIG, partialStack, merchant, counts)).toBe(true)
})

test("decrements cloned counts across withdrawals without mutating original counts", () => {
    const merchant = makeMerchant()
    const smokeCounts: LevelCounts = new Map<number | undefined, { q: number; inventorySpaces: number }>([
        [undefined, { q: 400, inventorySpaces: 4 }],
    ])
    const original: ItemCounts = new Map([["smoke", smokeCounts]])
    const planned = cloneItemCounts(original)

    const stacks = [
        new Item({ name: "smoke", q: 100 }, testG),
        new Item({ name: "smoke", q: 100 }, testG),
        new Item({ name: "smoke", q: 100 }, testG),
        new Item({ name: "smoke", q: 100 }, testG),
    ]

    let withdrawn = 0
    for (const stack of stacks) {
        if (!canSellStackToNpc(DEFAULT_ITEM_CONFIG, stack, merchant, planned)) continue
        decrementItemCount(planned, stack)
        withdrawn += 1
    }

    expect(withdrawn).toBe(2)
    expect(planned.get("smoke")?.get(undefined)?.q).toBe(200)
    expect(original.get("smoke")?.get(undefined)?.q).toBe(400)
})

test("keeps highest levels for leveled sellExcess items and still sells plain SELL_TO_NPC items", () => {
    const merchant = makeMerchant()
    const starCounts: LevelCounts = new Map<number | undefined, { q: number; inventorySpaces: number }>([
        [5, { q: 1, inventorySpaces: 1 }],
        [0, { q: 11, inventorySpaces: 11 }],
    ])
    const counts: ItemCounts = new Map([["throwingstars", starCounts]])

    const highStar = new Item({ name: "throwingstars", level: 5 }, testG)
    const lowStar = new Item({ name: "throwingstars", level: 0 }, testG)
    const deadBow = new Item({ name: "bowofthedead", level: 0 }, testG)

    expect(canSellStackToNpc(DEFAULT_ITEM_CONFIG, highStar, merchant, counts)).toBe(false)
    expect(canSellStackToNpc(DEFAULT_ITEM_CONFIG, lowStar, merchant, counts)).toBe(true)
    decrementItemCount(counts, lowStar)
    expect(canSellStackToNpc(DEFAULT_ITEM_CONFIG, lowStar, merchant, counts)).toBe(true)
    decrementItemCount(counts, lowStar)
    expect(canSellStackToNpc(DEFAULT_ITEM_CONFIG, lowStar, merchant, counts)).toBe(false)

    // Plain SELL_TO_NPC items work even when absent from itemCounts
    expect(canSellStackToNpc(DEFAULT_ITEM_CONFIG, deadBow, merchant, new Map())).toBe(true)
})

function setupErrandMerchant(id: string, fixedNow: number): {
    merchant: Merchant
    strategy: NewMerchantStrategy
    moveMainhand: Array<{ to: unknown; mainhand: string | undefined }>
    equipSpy: jest.SpiedFunction<Merchant["equip"]>
} {
    const merchant = makeMerchant()
    merchant.id = id
    merchant.name = id
    merchant.level = 80
    merchant.mp = 500
    merchant.map = "main"
    merchant.rip = false
    merchant.esize = 10
    merchant.isize = 42
    merchant.gold = 0
    merchant.c = {}
    merchant.s = {}
    merchant.S = {}
    merchant.merrit = {
        last: {
            at: fixedNow,
            character: id,
            id: "m1",
            item: "broom",
            name: id,
            quantity: 1,
            reason: "ok",
            shells: 0,
        },
        next_at: fixedNow + 3_600_000,
        reasons: [],
        server_now: fixedNow,
    }
    merchant.slots = { mainhand: { level: 7, name: "broom" } } as Merchant["slots"]
    merchant.items = [
        { level: 0, name: "rod" },
        { level: 0, name: "pickaxe" },
    ]
    setLastCheck(`${id}_banking`, fixedNow)

    const equipSpy = jest.spyOn(merchant, "equip").mockImplementation(async (inventoryPos) => {
        const nextItem = merchant.items[inventoryPos]
        const previous = merchant.slots.mainhand
        merchant.slots.mainhand = nextItem
        merchant.items[inventoryPos] = previous ?? undefined
        return Promise.resolve()
    })

    const moveMainhand: Array<{ to: unknown; mainhand: string | undefined }> = []
    jest.spyOn(merchant, "smartMove").mockImplementation(async (to) => {
        moveMainhand.push({ mainhand: merchant.slots.mainhand?.name, to })
        return Promise.resolve(to as IPosition)
    })

    const strategy = new NewMerchantStrategy({
        contexts: [],
        defaultPosition: { map: "main", x: 0, y: 0 },
        goldToHold: 0,
        itemConfig: {},
    })

    return { equipSpy, merchant, moveMainhand, strategy }
}

test("re-equips broom between fishing, mining, and subsequent travel", async () => {
    const fixedNow = 1_700_000_000_000
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedNow)
    try {
        const { equipSpy, merchant, moveMainhand, strategy } = setupErrandMerchant("mer_broom_cycle", fixedNow)
        const fishMainhands: Array<string | undefined> = []
        let fishCalls = 0
        jest.spyOn(merchant, "fish").mockImplementation(async () => {
            fishMainhands.push(merchant.slots.mainhand?.name)
            fishCalls += 1
            if (fishCalls >= 2) {
                merchant.nextSkill.set("fishing", new Date(fixedNow + 60_000))
            }
            return Promise.resolve("ok")
        })
        const mineMainhands: Array<string | undefined> = []
        jest.spyOn(merchant, "mine").mockImplementation(async () => {
            mineMainhands.push(merchant.slots.mainhand?.name)
            merchant.nextSkill.set("mining", new Date(fixedNow + 60_000))
            return Promise.resolve("ok")
        })

        await strategy.loops.get("move")?.fn(merchant)

        expect(fishMainhands).toEqual(["rod", "rod"])
        expect(mineMainhands).toEqual(["pickaxe"])
        expect(merchant.slots.mainhand?.name).toBe("broom")
        expect(moveMainhand).toEqual([
            { mainhand: "broom", to: mainFishingSpot },
            { mainhand: "rod", to: mainFishingSpot },
            { mainhand: "broom", to: miningSpot },
            { mainhand: "broom", to: { map: "main", x: 0, y: 0 } },
        ])
        expect(equipSpy).toHaveBeenCalledWith(0, "mainhand")
        expect(equipSpy).toHaveBeenCalledWith(1, "mainhand")
    } finally {
        nowSpy.mockRestore()
    }
})

test("re-equips broom when fishing or mining fails", async () => {
    const fixedNow = 1_700_000_000_000
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedNow)
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)
    try {
        const { merchant, moveMainhand, strategy } = setupErrandMerchant("mer_broom_error", fixedNow)
        jest.spyOn(merchant, "fish").mockRejectedValue(new Error("fish timeout"))
        jest.spyOn(merchant, "mine").mockRejectedValue(new Error("mine timeout"))

        await strategy.loops.get("move")?.fn(merchant)

        expect(merchant.slots.mainhand?.name).toBe("broom")
        expect(moveMainhand).toEqual([
            { mainhand: "broom", to: mainFishingSpot },
            { mainhand: "broom", to: miningSpot },
            { mainhand: "broom", to: { map: "main", x: 0, y: 0 } },
        ])
    } finally {
        errorSpy.mockRestore()
        nowSpy.mockRestore()
    }
})

test("does not interrupt an active fishing cast when equipping broom", async () => {
    const fixedNow = 1_700_000_000_000
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedNow)
    try {
        const { equipSpy, merchant, strategy } = setupErrandMerchant("mer_active_cast", fixedNow)
        merchant.slots.mainhand = { level: 0, name: "rod" }
        merchant.items = [{ level: 7, name: "broom" }]
        merchant.c.fishing = { drop: "f1", ms: 5_000 }
        merchant.nextSkill.set("fishing", new Date(fixedNow + 60_000))
        merchant.nextSkill.set("mining", new Date(fixedNow + 60_000))

        await strategy.loops.get("move")?.fn(merchant)

        expect(equipSpy).not.toHaveBeenCalled()
        expect(merchant.slots.mainhand?.name).toBe("rod")
    } finally {
        nowSpy.mockRestore()
    }
})
