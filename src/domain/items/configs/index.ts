import type { ItemCatalog } from "../item_schema.js"
import { replenishConfig } from "./replenish_config.js"
import { defaultItemRules } from "./default_rules.js"

export * from "./replenish_config.js"
export * from "./default_rules.js"

/**
 * Builds a merged item catalog combining replenishment rules, default rules,
 * and any custom user overrides.
 */
export function buildItemCatalog(overrides: ItemCatalog = {}): ItemCatalog {
    const catalog: ItemCatalog = {
        ...replenishConfig,
        ...defaultItemRules,
    }

    for (const [itemName, policy] of Object.entries(overrides)) {
        catalog[itemName] = {
            ...catalog[itemName],
            ...policy,
        }
    }

    return catalog
}

export const activeItemCatalog = buildItemCatalog()
