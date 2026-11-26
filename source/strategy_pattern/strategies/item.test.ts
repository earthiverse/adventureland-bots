import { jest } from "@jest/globals"
import { type GData, Merchant, Priest } from "alclient"
import { applyMassExchangeBuffs } from "./item.js"

const testG = {
    conditions: {
        massexchange: { buff: true },
        massexchangepp: { buff: true },
    },
    maps: {
        main: { safe: true },
    },
    skills: {
        massexchange: {
            class: ["merchant"],
            condition: "massexchange",
            cooldown: 50,
            level: 40,
            mp: 30,
        },
        massexchangepp: {
            class: ["merchant"],
            condition: "massexchangepp",
            cooldown: 50,
            level: 70,
            mp: 200,
        },
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

function makeMerchant(mp: number, level = 80): Merchant {
    const merchant = new Merchant("", "", "", testG, serverData)
    merchant.level = level
    merchant.mp = mp
    merchant.map = "main"
    merchant.rip = false
    return merchant
}

test("casts both massExchangePP and massExchange when merchant has enough MP", async () => {
    const merchant = makeMerchant(230)
    const ppMock = jest.spyOn(merchant, "massExchangePP").mockResolvedValue(undefined)
    const exMock = jest.spyOn(merchant, "massExchange").mockResolvedValue(undefined)

    await applyMassExchangeBuffs(merchant)

    expect(ppMock).toHaveBeenCalledTimes(1)
    expect(exMock).toHaveBeenCalledTimes(1)
})

test("skips massExchange when remaining MP after massExchangePP is insufficient", async () => {
    const merchant = makeMerchant(229)
    const ppMock = jest.spyOn(merchant, "massExchangePP").mockResolvedValue(undefined)
    const exMock = jest.spyOn(merchant, "massExchange").mockResolvedValue(undefined)

    await applyMassExchangeBuffs(merchant)

    expect(ppMock).toHaveBeenCalledTimes(1)
    expect(exMock).not.toHaveBeenCalled()
})

test("catches massExchangePP errors and still casts massExchange", async () => {
    const merchant = makeMerchant(250)
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)
    const ppMock = jest.spyOn(merchant, "massExchangePP").mockRejectedValue(new Error("no_mp"))
    const exMock = jest.spyOn(merchant, "massExchange").mockResolvedValue(undefined)

    try {
        await applyMassExchangeBuffs(merchant)

        expect(ppMock).toHaveBeenCalledTimes(1)
        expect(exMock).toHaveBeenCalledTimes(1)
        expect(errorSpy).toHaveBeenCalledTimes(1)
    } finally {
        errorSpy.mockRestore()
    }
})

test("skips already-active buffs and ignores non-merchants", async () => {
    const merchant = makeMerchant(500)
    merchant.s.massexchangepp = { ms: 5000 }
    const ppMock = jest.spyOn(merchant, "massExchangePP").mockResolvedValue(undefined)
    const exMock = jest.spyOn(merchant, "massExchange").mockResolvedValue(undefined)

    await applyMassExchangeBuffs(merchant)

    expect(ppMock).not.toHaveBeenCalled()
    expect(exMock).toHaveBeenCalledTimes(1)

    const priest = new Priest("", "", "", testG, serverData)
    priest.level = 80
    priest.mp = 500
    await expect(applyMassExchangeBuffs(priest)).resolves.toBeUndefined()
})
