import {
    collectMerchantOffers,
    collectMerchantSwapDealRows,
    mergeMerchantOffers,
    normalizeTradeWant,
    sortMerchantOffers,
} from "./tradeMessage.js"
import { formatGoldShort } from "./tradeDeals.js"

const nowIso = () => new Date().toISOString()

const cscrollFixture = [
    {
        id: "Seresta",
        lastSeen: nowIso(),
        serverRegion: "EU",
        serverIdentifier: "I",
        slots: {
            trade23: { name: "cscroll3", q: 1, price: 1_700_000_000 },
            trade24: { name: "cscroll3", q: 1, want: { name: "offeringx", q: 3 } },
        },
    },
]

const nightberryFixture = [
    {
        id: "BknMerchant",
        lastSeen: nowIso(),
        serverRegion: "US",
        serverIdentifier: "I",
        slots: {
            trade10: { name: "slice_blueberry", q: 5, want: { name: "slice_nightberry", q: 6 } },
            trade15: { name: "slice_nightberry", q: 10, want: { name: "slice_honey", q: 10 } },
        },
    },
]

test("normalizeTradeWant accepts string and object forms", () => {
    expect(normalizeTradeWant("intbelt")).toEqual({ name: "intbelt" })
    expect(normalizeTradeWant({ name: "wbook0", level: 1 })).toEqual({ name: "wbook0", level: 1 })
    expect(normalizeTradeWant(undefined)).toBeNull()
})

test("gold stands skip want swaps so price formatting does not crash", () => {
    const collected = collectMerchantOffers(cscrollFixture, "cscroll3")
    const selling = sortMerchantOffers(mergeMerchantOffers(collected.selling), "sell")

    expect(selling).toHaveLength(1)
    expect(selling[0].price).toBe(1_700_000_000)
    expect(selling.map((o) => formatGoldShort(o.price))).toEqual(["1.7B"])
})

test("collectMerchantSwapDealRows reports offered and wanted sides", () => {
    const forScroll = collectMerchantSwapDealRows(cscrollFixture, "cscroll3")
    expect(forScroll.offering).toHaveLength(1)
    expect(forScroll.wanting).toHaveLength(0)
    expect(forScroll.offering[0].terms).toBe("1 cscroll3 → 3 offeringx")
    expect(forScroll.offering[0].ratio).toBe("1:3")
    expect(forScroll.offering[0].owner).toBe("Seresta (EU I)")

    const forOffering = collectMerchantSwapDealRows(cscrollFixture, "offeringx")
    expect(forOffering.offering).toHaveLength(0)
    expect(forOffering.wanting).toHaveLength(1)
    expect(forOffering.wanting[0].terms).toBe("1 cscroll3 → 3 offeringx")
    expect(forOffering.wanting[0].ratio).toBe("1:3")
})

test("slice_nightberry appears on both offer and want sides of swaps", () => {
    const rows = collectMerchantSwapDealRows(nightberryFixture, "slice_nightberry")
    expect(rows.offering.map((r) => `${r.ratio}|${r.terms}`)).toEqual([
        "1:1|10 slice_nightberry → 10 slice_honey",
    ])
    expect(rows.wanting.map((r) => `${r.ratio}|${r.terms}`)).toEqual([
        "5:6|5 slice_blueberry → 6 slice_nightberry",
    ])
})

test("string want slots are collected as swaps", () => {
    const fixture = [
        {
            name: "StringWant",
            lastSeen: Date.now(),
            serverRegion: "US",
            serverIdentifier: "I",
            slots: {
                trade1: { name: "cape", q: 1, want: "offering" },
            },
        },
    ]
    const rows = collectMerchantSwapDealRows(fixture, "cape")
    expect(rows.offering).toHaveLength(1)
    expect(rows.offering[0].ratio).toBe("1:1")
    expect(rows.offering[0].terms).toBe("1 cape → 1 offering")
})

test("accepts numeric lastSeen and name-as-id merchant payloads", () => {
    const fixture = [
        {
            name: "LegacyMerch",
            lastSeen: Date.now(),
            serverRegion: "EU",
            serverIdentifier: "II",
            slots: {
                trade1: { name: "cscroll3", q: 1, price: 100 },
            },
        },
    ]
    const collected = collectMerchantOffers(fixture, "cscroll3")
    expect(collected.selling).toHaveLength(1)
    expect(collected.selling[0].id).toBe("LegacyMerch")
})

test("merchant swaps stay separate from earthiverse deal rows in summary counts", async () => {
    const { buildSummaryText } = await import("./tradeTables.js")
    const swaps = collectMerchantSwapDealRows(cscrollFixture, "cscroll3")
    const summary = buildSummaryText({
        item: "cscroll3",
        displayName: "Legendary Compound Scroll",
        variants: ["cscroll3"],
        gPrice: 4_800_000,
        selling: sortMerchantOffers(mergeMerchantOffers(collectMerchantOffers(cscrollFixture, "cscroll3").selling), "sell"),
        buying: [],
        swapOffering: swaps.offering,
        swapWanting: swaps.wanting,
        dealWts: [],
        dealWtb: [],
    })
    expect(summary).toContain("**1** selling")
    expect(summary).toContain("**1** swap")
    expect(summary).toContain("**0** deals")
    expect(summary).not.toMatch(/\*\*1\*\* deals/)
})
