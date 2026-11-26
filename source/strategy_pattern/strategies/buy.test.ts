import { type GData, type ItemDataTrade, Merchant } from "alclient"
import { TradeItem } from "alclient/build/TradeItem.js"
import type { ItemConfig } from "../../base/itemsNew.js"
import { getPlayerPurchaseQuantity, shouldBuyFromPonty } from "./buy.js"

const testG = {
    items: {
        fury: { g: 6_400_000, grades: [0, 0, 10, 12], type: "helmet", upgrade: { armor: 1.5 } },
        hpot1: { g: 100, s: 9999, type: "pot" },
        jacko: { compound: { rpiercing: 15 }, g: 96_000, grades: [2, 4, 6, 7], type: "orb" },
        offeringp: { g: 480_000, s: 9999, type: "material" },
        "5bucks": { cash: 1, g: 50_000_000, type: "material" },
    },
    multipliers: {
        buy_to_sell: 0.6,
        lostandfound_mult: 4,
        secondhands_cash_mult: 3,
        secondhands_mult: 2,
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

function makeMerchant(gold: number): Merchant {
    const merchant = new Merchant("", "", "", testG, serverData)
    merchant.gold = gold
    merchant.esize = 10
    return merchant
}

test("buys full affordable stack of offeringp from players", () => {
    const config: ItemConfig = {
        offeringp: { buy: true, buyPrice: 5_000_000 },
    }
    const listing = new TradeItem({ name: "offeringp", price: 5_000_000, q: 25, rid: "r1" }, testG)

    expect(getPlayerPurchaseQuantity(config, listing, makeMerchant(500_000_000), false, testG)).toBe(25)
    expect(getPlayerPurchaseQuantity(config, listing, makeMerchant(12_000_000), false, testG)).toBe(2)
    expect(getPlayerPurchaseQuantity(config, listing, makeMerchant(4_999_999), false, testG)).toBe(0)
})

test("caps replenish stack purchases to missing quantity", () => {
    const config: ItemConfig = {
        hpot1: { hold: true, replenish: 1000 },
    }
    const merchant = makeMerchant(1_000_000)
    merchant.items = [{ name: "hpot1", q: 800 }]
    const listing = new TradeItem({ name: "hpot1", price: 100, q: 9999, rid: "r2" }, testG)

    expect(getPlayerPurchaseQuantity(config, listing, merchant, false, testG)).toBe(200)
})

test("allows numeric buyPrice at Ponty when Ponty price is within limit", () => {
    const config: ItemConfig = {
        "5bucks": { buy: true, buyPrice: 100_000_000 },
        fury: { buy: true, buyPrice: 10_000_000 },
        jacko: { buy: true, buyPrice: "ponty" },
        offeringp: { buy: true, buyPrice: 5_000_000 },
    }
    const merchant = makeMerchant(500_000_000)

    // offeringp: 480k * 2 = 960k <= 5M
    const pontyPrim: ItemDataTrade = { name: "offeringp", price: 0, q: 3, rid: "p1" }
    expect(shouldBuyFromPonty(config, pontyPrim, merchant, testG)).toBe(true)

    // fury: 6.4M * 2 = 12.8M > 10M limit
    const pontyFury: ItemDataTrade = { level: 0, name: "fury", price: 0, rid: "p2" }
    expect(shouldBuyFromPonty(config, pontyFury, merchant, testG)).toBe(false)

    // cash item uses secondhands_cash_mult (50M * 3 = 150M > 100M limit)
    const pontyCash: ItemDataTrade = { name: "5bucks", price: 0, rid: "p3" }
    expect(shouldBuyFromPonty(config, pontyCash, merchant, testG)).toBe(false)

    // "ponty" buyPrice still buys
    const pontyJacko: ItemDataTrade = { level: 0, name: "jacko", price: 0, rid: "p4" }
    expect(shouldBuyFromPonty(config, pontyJacko, merchant, testG)).toBe(true)
})
