import type { ItemCatalog } from "../item_schema.js"

export const defaultItemRules: ItemCatalog = {
    // Common Base Equipment (Sell level 0 duplicates to NPC)
    pants: {
        sell: true,
        sellPrice: "npc",
        upgradeUntilLevel: 7,
    },
    coat: {
        sell: true,
        sellPrice: "npc",
        upgradeUntilLevel: 7,
    },
    shoes: {
        sell: true,
        sellPrice: "npc",
        upgradeUntilLevel: 7,
    },
    gloves: {
        sell: true,
        sellPrice: "npc",
        upgradeUntilLevel: 7,
    },
    helmet: {
        sell: true,
        sellPrice: "npc",
        upgradeUntilLevel: 7,
    },

    // Accessories (Compound up to level 2)
    ringsj: {
        compoundUntilLevel: 2,
        hold: true,
    },
    hpbelt: {
        compoundUntilLevel: 2,
        hold: true,
    },
    hpamulet: {
        compoundUntilLevel: 2,
        hold: true,
    },
    wbook0: {
        compoundUntilLevel: 2,
        hold: ["mage", "priest"],
    },

    // Exchanges
    anniversarygift: {
        buy: true,
        buyPrice: "ponty",
        exchange: true,
    },
    armorbox: {
        buy: true,
        buyPrice: "ponty",
        exchange: true,
    },
    weaponbox: {
        buy: true,
        buyPrice: "ponty",
        exchange: true,
    },
    gemfragment: {
        exchange: true,
    },

    // High-Value Ponty Snipes
    angelwings: {
        buy: true,
        buyPrice: "ponty",
        hold: true,
    },
    amuletofm: {
        buy: true,
        buyPrice: 500_000_000,
        hold: true,
    },
    basher: {
        buy: true,
        buyPrice: "ponty",
    },
}
