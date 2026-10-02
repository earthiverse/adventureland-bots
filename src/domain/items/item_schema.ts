import { z } from "zod"

export const CharacterTypeSchema = z.enum([
    "mage",
    "merchant",
    "paladin",
    "priest",
    "ranger",
    "rogue",
    "warrior",
])

export const HoldPolicySchema = z.object({
    /** If true, all bots hold this item. If array, only specified character types hold it. */
    hold: z.union([z.boolean(), z.array(CharacterTypeSchema)]).optional(),
    /** Target quantity to maintain in inventory. Triggers replenishment if below this amount. */
    replenish: z.number().int().positive().optional(),
    /** Preferred inventory slot index (0-41) for this item */
    holdSlot: z.number().int().min(0).max(41).optional(),
})

export const UpgradePolicySchema = z.object({
    /** Maximum level to upgrade this item to */
    upgradeUntilLevel: z.number().int().min(0).max(13).optional(),
    /** If item is below this level, destroy it instead of upgrading/selling */
    destroyBelowLevel: z.number().int().min(0).max(13).optional(),
    /** Level at which to start using offerings/primlings */
    offeringAtLevel: z.number().int().min(0).max(13).optional(),
})

export const CompoundPolicySchema = z.object({
    /** Maximum level to compound accessories to */
    compoundUntilLevel: z.number().int().min(0).max(13).optional(),
    /** Level at which to start using offerings/primlings */
    offeringAtLevel: z.number().int().min(0).max(13).optional(),
})

export const SellPriceSchema = z.union([
    z.number().positive(),
    z.literal("npc"),
    z.record(z.coerce.number().int().min(0), z.number().positive()),
])

export const SellPolicySchema = z.object({
    /** If true, eligible to be sold */
    sell: z.boolean().optional(),
    /** Minimum price or "npc" for calculated NPC sell value, or per-level mapping */
    sellPrice: SellPriceSchema.optional(),
    /** If total owned exceeds this quantity, sell the excess */
    sellExcess: z.number().int().positive().optional(),
    /** If true, list on merchant stand */
    list: z.boolean().optional(),
})

export const BuyPriceSchema = z.union([
    z.number().positive(),
    z.literal("ponty"),
])

export const BuyPolicySchema = z.object({
    /** If true, buy this item when seen */
    buy: z.boolean().optional(),
    /** Maximum price to pay, or "ponty" to buy from secondhand dealer at game price */
    buyPrice: BuyPriceSchema.optional(),
    /** If true, list as a buy order on merchant stand */
    list: z.boolean().optional(),
})

export const ExchangePolicySchema = z.object({
    /** If true, exchange at the exchange NPC when a full stack is gathered */
    exchange: z.boolean().optional(),
    /** If set, only exchange if the item is at this specific level (e.g. lostearring) */
    exchangeAtLevel: z.number().int().min(0).optional(),
})

export const DismantlePolicySchema = z.object({
    /** If true, dismantle at craftsman into raw crafting materials */
    dismantle: z.boolean().optional(),
})

export const ItemPolicySchema = HoldPolicySchema
    .merge(UpgradePolicySchema)
    .merge(CompoundPolicySchema)
    .merge(SellPolicySchema)
    .merge(BuyPolicySchema)
    .merge(ExchangePolicySchema)
    .merge(DismantlePolicySchema)

export const ItemCatalogSchema = z.record(z.string(), ItemPolicySchema)

// Inferred TypeScript Types
export type CharacterType = z.infer<typeof CharacterTypeSchema>
export type HoldPolicy = z.infer<typeof HoldPolicySchema>
export type UpgradePolicy = z.infer<typeof UpgradePolicySchema>
export type CompoundPolicy = z.infer<typeof CompoundPolicySchema>
export type SellPolicy = z.infer<typeof SellPolicySchema>
export type BuyPolicy = z.infer<typeof BuyPolicySchema>
export type ExchangePolicy = z.infer<typeof ExchangePolicySchema>
export type DismantlePolicy = z.infer<typeof DismantlePolicySchema>
export type ItemPolicy = z.infer<typeof ItemPolicySchema>
export type ItemCatalog = z.infer<typeof ItemCatalogSchema>
