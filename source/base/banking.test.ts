import type { GData } from "alclient"
import { getBankStackKey } from "./banking.js"

const testG = {
    items: {
        blade: {},
        cxjar: { s: 9999 },
        gem0: { s: 9999 },
        mpot1: { s: 9999 },
    },
    titles: {
        festive: { stackable: true },
        shiny: {},
    },
} as unknown as GData

test("ignores unstackable, full, locked, and blocked items", () => {
    expect(getBankStackKey({ name: "blade" }, testG)).toBeUndefined()
    expect(getBankStackKey({ name: "blade", q: 1 }, testG)).toBeUndefined()
    expect(getBankStackKey({ name: "gem0", q: 9999 }, testG)).toBeUndefined()
    expect(getBankStackKey({ name: "gem0", q: 9998 }, testG)).toBeDefined()
    expect(getBankStackKey({ name: "gem0", q: 10, l: "l" }, testG)).toBeUndefined()
    expect(getBankStackKey({ name: "gem0", q: 10, l: "s" }, testG)).toBeUndefined()
    expect(getBankStackKey({ name: "gem0", q: 10, l: "x" }, testG)).toBeUndefined()
    expect(getBankStackKey({ name: "gem0", q: 10, b: "stand" }, testG)).toBeUndefined()
})

test("separates cxjar stacks by cosmetic data", () => {
    const jarA1 = getBankStackKey({ name: "cxjar", q: 2, data: "hat1" }, testG)
    const jarA2 = getBankStackKey({ name: "cxjar", q: 5, data: "hat1" }, testG)
    const jarB = getBankStackKey({ name: "cxjar", q: 2, data: "hat2" }, testG)

    expect(jarA1).toBeDefined()
    expect(jarA1).toBe(jarA2)
    expect(jarA1).not.toBe(jarB)
})

test("separates non-stackable titles and pvp markings, but merges stackable titles", () => {
    const plain = getBankStackKey({ name: "mpot1", q: 100 }, testG)
    const stackableTitle = getBankStackKey({ name: "mpot1", q: 50, p: "festive" }, testG)
    const specialTitle = getBankStackKey({ name: "mpot1", q: 50, p: "shiny" }, testG)
    const pvpMarked = getBankStackKey({ name: "mpot1", q: 50, v: "1" }, testG)

    expect(plain).toBeDefined()
    expect(stackableTitle).toBe(plain)
    expect(specialTitle).not.toBe(plain)
    expect(pvpMarked).not.toBe(plain)
})
