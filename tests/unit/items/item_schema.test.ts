import { describe, expect, it } from "bun:test"
import {
    ItemCatalogSchema,
    ItemPolicySchema,
    type ItemPolicy,
} from "../../../src/domain/items/item_schema.js"

describe("ItemSchema", () => {
    it("should successfully parse a valid comprehensive item policy", () => {
        const policy: ItemPolicy = {
            hold: ["warrior", "merchant"],
            replenish: 1000,
            holdSlot: 39,
            upgradeUntilLevel: 8,
            compoundUntilLevel: 2,
            sell: true,
            sellPrice: "npc",
            buy: true,
            buyPrice: "ponty",
            exchange: true,
            dismantle: false,
        }

        const parsed = ItemPolicySchema.parse(policy)
        expect(parsed.replenish).toBe(1000)
        expect(parsed.holdSlot).toBe(39)
        expect(parsed.upgradeUntilLevel).toBe(8)
    })

    it("should accept sellPrice as a number, 'npc', or per-level mapping", () => {
        expect(ItemPolicySchema.safeParse({ sell: true, sellPrice: "npc" }).success).toBe(true)
        expect(ItemPolicySchema.safeParse({ sell: true, sellPrice: 50000 }).success).toBe(true)
        expect(
            ItemPolicySchema.safeParse({
                sell: true,
                sellPrice: { 0: 5000, 1: 10000 },
            }).success,
        ).toBe(true)
    })

    it("should reject invalid character types or negative values", () => {
        // Invalid character type
        const invalidChar = ItemPolicySchema.safeParse({
            hold: ["invalid_class" as any],
        })
        expect(invalidChar.success).toBe(false)

        // Negative replenishment
        const negativeReplenish = ItemPolicySchema.safeParse({
            replenish: -10,
        })
        expect(negativeReplenish.success).toBe(false)

        // Out of range slot (> 41)
        const invalidSlot = ItemPolicySchema.safeParse({
            holdSlot: 55,
        })
        expect(invalidSlot.success).toBe(false)
    })

    it("should validate an entire ItemCatalog map", () => {
        const catalog = {
            hpot1: { hold: true, replenish: 1000 },
            pants: { sell: true, sellPrice: "npc" },
            ringsj: { compoundUntilLevel: 2 },
        }

        const result = ItemCatalogSchema.safeParse(catalog)
        expect(result.success).toBe(true)
    })
})
