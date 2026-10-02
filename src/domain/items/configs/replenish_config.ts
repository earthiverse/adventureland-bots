import type { ItemCatalog } from "../item_schema.js"

export const replenishConfig: ItemCatalog = {
    // Health Potions
    hpot0: {
        hold: true,
        holdSlot: 39,
        replenish: 1000,
    },
    hpot1: {
        hold: true,
        holdSlot: 39,
        replenish: 1000,
    },

    // Mana Potions
    mpot0: {
        hold: true,
        holdSlot: 38,
        replenish: 1000,
    },
    mpot1: {
        hold: true,
        holdSlot: 38,
        replenish: 1000,
    },

    // Experience & Utility
    xptome: {
        hold: true,
        replenish: 1,
    },
    offering: {
        hold: ["merchant"],
        replenish: 1,
    },

    // Merchant Upgrading Scrolls
    scroll0: {
        hold: ["merchant"],
        replenish: 50,
    },
    cscroll0: {
        hold: ["merchant"],
        replenish: 50,
    },
}
