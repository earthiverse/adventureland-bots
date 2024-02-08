import AL, { CharacterType, GData, ItemName } from "alclient"

// TODO: Figure out how to require buy_price if buy is set
type BuyConfig = {
    /** If set, we should try to buy it from other players or NPCs */
    buy?: true
    /** 
     * Maximum price to pay for the item.
     * 
     * If set to a number, we should buy it for that much at level 0.
     * 
     * If set to 'ponty', we should buy it for as much as ponty is selling it for.
     * 
     * TODO: How should we go about buying the item at higher levels?
     */
    buy_price?: number | "ponty"
}

type CraftConfig = {
    /** If set, we should try to craft it */
    craft?: true
}

type ExchangeConfig = {
    /** If set, we should try to exchange it. */
    exchange?: true
    /** 
     * If set, we should only exchange it at the given level. 
     * This is for items like `goldenearring` that can be combined.
     * Each level has a different drop table.
     */
    exchangeAtLevel?: number
}

type HoldConfig = {
    /** 
     * If set to true, we will have all bots hold on to these items
     * 
     * If set to an array, we will check that those character types hold on to these items
     */
    hold?: true | CharacterType[]
    /** 
     * If set, we should try to always have this many of the item in our inventory at any time 
     * 
     * We should only replenish if "hold" is true, or set to our character type
     **/
    replenish?: number
    /** 
     * If set, we should try to place it in this slot in in our inventory
     * 
     * We should only organize it in this slot if "hold" is true, or set to our character type
     * */
    hold_slot?: number
}

// TODO: Figure out how to require sell_price if sell is set
type SellConfig = {
    /** If set, we should sell it to other players or NPCs */
    sell?: true
    /** Minimum price to sell it for */
    sell_price?: number
    /** If we have more than this number of this item, we should sell the excess */
    sell_excess?: number
}

type UpgradeConfig = {
    /** If true, we should destroy the item if it's below the specified level */
    destroyBelowLevel?: number
    /** If set, we should stop upgrading the item at the specified level */
    upgradeUntilLevel?: number
    /** If set, we should use a primling to upgrade the item if it's at or above the specified level */
    usePrimlingFromLevel?: number
    /** If set, we should use an offering to upgrade the item if it's at or above the specified level */
    useOfferingFromLevel?: number
}

type CombinedConfig =
    & BuyConfig
    & CraftConfig
    & ExchangeConfig
    & HoldConfig
    & SellConfig
    & UpgradeConfig;
type ItemConfig = Partial<Record<ItemName, CombinedConfig>>;

export const DEFAULT_ITEM_CONFIG: ItemConfig = {
    "5bucks": {
        buy: true,
        buy_price: 100_000_000
    },
    "amuletofm": {
        buy: true,
        buy_price: 500_000_000
    },
    "angelwings": {
        buy: true,
        buy_price: "ponty"
    },
    "armorbox": {
        buy: true,
        buy_price: "ponty",
        exchange: true
    },
    "armorring": {
        buy: true,
        buy_price: 1_000_000,
        craft: true,
        exchange: true
    },
    "basketofeggs": {
        craft: true,
        exchange: true
    },
    "bcape": {
        // We can craft other capes at level 7
        upgradeUntilLevel: 7
    },
    "bfangamulet": {
        buy: true,
        buy_price: "ponty",
        craft: true
    },
    "cake": {
        craft: true
    },
    /** Blue Candy */
    "candy0": {
        exchange: true
    },
    /** Pink Candy */
    "candy1": {
        exchange: true
    },
    "candycane": {
        exchange: true
    },
    "candypop": {
        exchange: true
    },
    "carrotsword": {
        craft: true
    },
    "cclaw": {
        craft: true
    },
    "cdragon": {
        sell_excess: 5
    },
    "computer": {
        hold: true
    },
    "cscroll0": {
        hold: ["merchant"]
        // TODO: What slot?
    },
    "cscroll1": {
        hold: ["merchant"]
        // TODO: What slot?
    },
    "cscroll2": {
        hold: ["merchant"]
        // TODO: What slot?
    },
    "eggnog": {
        sell_excess: 9999 * 3
    },
    "elixirdex1": {
        craft: true
    },
    "elixirdex2": {
        craft: true
    },
    "elixirint1": {
        craft: true
    },
    "elixirint2": {
        craft: true
    },
    "elixirstr1": {
        craft: true
    },
    "elixirstr2": {
        craft: true
    },
    "elixirvit1": {
        craft: true
    },
    "elixirvit2": {
        craft: true
    },
    "essenceoflife": {
        sell_excess: 9999 * 5
    },
    "fieldgen0": {
        sell_excess: 20
    },
    "firestars": {
        craft: true
    },
    "frostbow": {
        craft: true
    },
    /** Green Gem */
    "gem0": {
        exchange: true
    },
    /** Red Gem */
    "gem1": {
        exchange: true
    },
    "gemfragment": {
        exchange: true
    },
    "goldbooster": {
        hold: true
    },
    "greenenvelope": {
        exchange: true
    },
    "hotchocolate": {
        sell_excess: 9999 * 3
    },
    "hpot1": {
        hold: true,
        replenish: 1000
        // TODO: What slot?
    },
    "leather": {
        exchange: true
    },
    "lostearring": {
        exchange: true,
        exchangeAtLevel: 2
    },
    "luckbooster": {
        hold: true
    },
    "mistletoe": {
        exchange: true
    },
    "mpot1": {
        hold: true,
        replenish: 1000
        // TODO: What slot?
    },
    "offering": {
        hold: ["merchant"],
        // TODO: What slot?
    },
    "offeringp": {
        hold: ["merchant"],
        // TODO: What slot?
    },
    "pickaxe": {
        hold: ["merchant"]
    },
    "pouchbow": {
        craft: true
    },
    "pumpkinspice": {
        sell_excess: 9999 * 3
    },
    "resistancering": {
        craft: true
    },
    "rod": {
        hold: ["merchant"]
    },
    "scroll0": {
        hold: ["merchant"]
        // TODO: What slot?
    },
    "scroll1": {
        hold: ["merchant"]
        // TODO: What slot?
    },
    "scroll2": {
        hold: ["merchant"]
        // TODO: What slot?
    },
    "seashell": {
        exchange: true
    },
    "smoke": {
        sell_excess: 200
    },
    "snakeoil": {
        exchange: true
    },
    "snowball": {
        sell_excess: 200 * 3
    },
    "snowflakes": {
        craft: true
    },
    "spookyamulet": {
        sell_excess: 5
    },
    "stick": {
        // We can craft sticks at level 9
        upgradeUntilLevel: 9
    },
    "supercomputer": {
        hold: true
    },
    "tracker": {
        hold: true
    },
    "throwingstars": {
        // We use level 0 to craft other stars
        upgradeUntilLevel: 0
    },
    "wattire": {
        craft: true
    },
    "wbreeches": {
        craft: true
    },
    "wcap": {
        craft: true
    },
    "weaponbox": {
        exchange: true
    },
    "wgloves": {
        craft: true
    },
    "wingedboots": {
        craft: true
    },
    "wshoes": {
        craft: true
    },
    "xbox": {
        craft: true
    },
    "xpbooster": {
        hold: true
    },
    "xptome": {
        hold: true,
        replenish: 1
    }
}

/**
 * This function will perform some sanity checks on the item config to help minimize
 * potential errors
 */
export async function runSanityCheckOnItemConfig(itemConfig = DEFAULT_ITEM_CONFIG) {
    // We need G for the checks
    await AL.Game.getGData()

    /** Used to ensure `hold_slot`s are unique */
    const holdSlots = new Map<number, ItemName>()

    for (const key in itemConfig) {
        const itemName = key as ItemName
        const config = itemConfig[itemName]
        const gItem = AL.Game.G.items[itemName]
        const gCraft = AL.Game.G.craft[itemName]

        // TODO: Check if an NPC sells it, and how much they sell it for

        if (config.buy) {
            if (config.buy_price === undefined) {
                console.warn(`${itemName} has no buy price, removing 'buy: true'`)
                delete config.buy
            }
        }

        if (config.craft) {
            if (gCraft === undefined) {
                console.warn(`${itemName} is not craftable, removing 'craft: true'`)
                delete config.craft
            }
        }

        if (config.exchange) {
            // TODO: If it's upgradable, make sure exchangeAtLevel is set
            if (gItem.e === undefined) {
                console.warn(`${itemName} is not exchangable, removing 'exchange: true'`)
                delete config.craft
            } else if ((gItem.upgrade || gItem.compound) && config.exchangeAtLevel === undefined) {
                console.warn(`${itemName} is compoundable / upgradable, but is missing exchangeAtLevevl, removing 'exchange: true'`)
                delete config.exchange
            }
        }

        if (config.hold) {
            if (config.hold_slot !== undefined) {
                if (config.hold_slot > 41) {
                    console.warn(`${itemName} cannot be put in to slot ${config.hold_slot}, removing 'slot: ${config.hold_slot}'`)
                    delete config.hold_slot
                } else {
                    if (holdSlots.has(config.hold_slot)) {
                        console.warn(`${itemName} overlaps with ${holdSlots.get(config.hold_slot)} hold_slot, removing '${config.hold_slot}'`)
                        delete config.hold_slot
                    } else {
                        holdSlots.set(config.hold_slot, itemName)
                    }
                }
            }
        }

        if (config.sell) {
            // TODO: Check if an NPC sells it, and how much they sell it for
            if (config.sell_price === undefined) {
                console.warn(`${itemName} has no sell price, removing 'sell: true'`)
                delete config.sell
            }
        }

        if (config.upgradeUntilLevel) {
            if (config.destroyBelowLevel) {
                console.warn(`${itemName} has both 'upgradeUntilLevel' and 'destroyBelowLevel' are set, removing both`)
                delete config.destroyBelowLevel
                delete config.upgradeUntilLevel
            }
        }

        if (config.useOfferingFromLevel && config.usePrimlingFromLevel) {
            if (config.useOfferingFromLevel <= config.usePrimlingFromLevel) {
                console.warn(`${itemName} has 'useOfferingFromLevel' <= and 'usePrimlingFromLevel'. Removing 'usePrimlingFromLevel'`)
                delete config.usePrimlingFromLevel
            }
        }
    }

    // TODO: If we are selling it for less than G, bump it up to minimum NPC price

    // TODO: If we are buying it for more than G, make sure no NPC sells it
}