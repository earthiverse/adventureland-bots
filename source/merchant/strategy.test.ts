import { type GData, Item, Merchant } from "alclient"
import { DEFAULT_ITEM_CONFIG, type ItemCounts, type LevelCounts } from "../base/itemsNew.js"
import { canSellStackToNpc, cloneItemCounts, decrementItemCount } from "./strategy.js"

const testG = {
    items: {
        bowofthedead: { g: 228_000, type: "weapon", upgrade: { attack: 6.4 } },
        pumpkinspice: { g: 200, s: 9999, type: "elixir" },
        smoke: { g: 20, s: 100, type: "throw" },
        throwingstars: { g: 72_000, type: "weapon", upgrade: { attack: 2.5 } },
    },
    multipliers: {
        buy_to_sell: 0.6,
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
