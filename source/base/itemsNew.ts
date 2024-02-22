import AL, { CharacterType, Item, ItemName, NPCName } from "alclient"

// TODO: Figure out how to require buy_price if buy is set
export type BuyConfig = {
    /** If set, we should try to buy it from other players or NPCs */
    buy?: true
    /** 
     * Maximum price to pay for the item.
     * 
     * If set to a number, we should buy it for that much at level 0.
     * 
     * If set to 'ponty', we should buy it for as much as ponty is selling it for (G * multipliers.secondhands_mult).
     * 
     * TODO: How should we go about buying the item at higher levels?
     */
    buyPrice?: number | "ponty"
}

export type CraftConfig = {
    /** If set, we should try to craft it */
    craft?: true
}

export type ExchangeConfig = {
    /** If set, we should try to exchange it. */
    exchange?: true
    /** 
     * If set, we should only exchange it at the given level. 
     * This is for items like `goldenearring` that can be combined.
     * Each level has a different drop table.
     */
    exchangeAtLevel?: number
}

export type HoldConfig = {
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
     */
    replenish?: number
    /** 
     * If set, we should try to place it in this slot in in our inventory
     * 
     * We should only organize it in this slot if "hold" is true, or set to our character type
     */
    holdSlot?: number
}

// TODO: Figure out how to require sell_price if sell is set
export type SellConfig = {
    /** If set, we should sell it to other players or NPCs */
    sell?: true
    /**
     * Minimum price to sell it for
     * 
     * If it's a number, we should sell it at that price if 
     * it's an item without a level, or an item at level 0
     * 
     * If it's "npc", sell it at `G * G.multipliers.buy_to_sell`
     * 
     * If it's an object, treat it as sellPrice[level] is sellPrice
     */
    sellPrice?: number | "npc" | { [T in number]: number }
    /** If we have more than this number of this item, we should sell the excess */
    sellExcess?: number
}

export type UpgradeConfig = {
    /** 
     * If set, we should destroy the item if it's below the specified level
     * 
     * If set, we should NOT upgrade the item
     */
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
export type ItemConfig = Partial<Record<ItemName, CombinedConfig>>;

export const REPLENISH_ITEM_CONFIG: ItemConfig = {
    "hpot1": {
        hold: true,
        holdSlot: 39,
        replenish: 1000
    },
    "mpot1": {
        hold: true,
        holdSlot: 38,
        replenish: 1000
    },
    "xptome": {
        hold: true,
        replenish: 1
    }
}

export const DEFAULT_ITEM_CONFIG: ItemConfig = {
    ...REPLENISH_ITEM_CONFIG,
    "5bucks": {
        buy: true,
        buyPrice: 100_000_000
    },
    "amuletofm": {
        buy: true,
        buyPrice: 500_000_000
    },
    "angelwings": {
        buy: true,
        buyPrice: "ponty"
    },
    "armorbox": {
        buy: true,
        buyPrice: "ponty",
        exchange: true
    },
    "armorring": {
        buy: true,
        buyPrice: 1_000_000,
        craft: true
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
        buyPrice: "ponty",
        craft: true
    },
    "cake": {
        craft: true,
        sell: true,
        sellPrice: "npc"
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
        craft: true,
        destroyBelowLevel: 1
    },
    "cclaw": {
        craft: true,
        destroyBelowLevel: 1
    },
    "cdragon": {
        sellExcess: 5
    },
    "coat": {
        destroyBelowLevel: 1
    },
    "coat1": {
        destroyBelowLevel: 1
    },
    "computer": {
        hold: true,
        holdSlot: 40
    },
    "cscroll0": {
        hold: ["merchant"],
        holdSlot: 28
    },
    "cscroll1": {
        hold: ["merchant"],
        holdSlot: 29
    },
    "cscroll2": {
        hold: ["merchant"],
        holdSlot: 30
    },
    "dexring": {
        sell: true,
        sellPrice: "npc"
    },
    "eggnog": {
        sellExcess: 9999 * 3
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
        sellExcess: 9999 * 5
    },
    "fieldgen0": {
        sellExcess: 20
    },
    "firestars": {
        craft: true
    },
    "frankypants": {
        destroyBelowLevel: 1
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
    "gloves": {
        destroyBelowLevel: 1
    },
    "gloves1": {
        destroyBelowLevel: 1
    },
    "goldbooster": {
        hold: true
    },
    "gphelmet": {
        destroyBelowLevel: 1
    },
    "greenenvelope": {
        exchange: true
    },
    "helmet": {
        destroyBelowLevel: 1
    },
    "helmet1": {
        destroyBelowLevel: 1
    },
    "hotchocolate": {
        sellExcess: 9999 * 3
    },
    "hpamulet": {
        sell: true,
        sellPrice: "npc"
    },
    "hpbelt": {
        upgradeUntilLevel: 2
    },
    "hpot0": {
        sell: true,
        sellPrice: "npc"
    },
    "iceskates": {
        destroyBelowLevel: 1
    },
    "intearring": {
        sell: true,
        sellPrice: "npc"
    },
    "intring": {
        sell: true,
        sellPrice: "npc"
    },
    "lbelt": {
        craft: true
    },
    "leather": {
        exchange: true
    },
    "lostearring": {
        exchange: true,
        exchangeAtLevel: 2,
        upgradeUntilLevel: 2
    },
    "luckbooster": {
        hold: true
    },
    "maceofthedead": {
        destroyBelowLevel: 1
    },
    "mistletoe": {
        exchange: true
    },
    "monstertoken": {
        sell: true,
        sellPrice: 250_000
    },
    "mpot0": {
        sell: true,
        sellPrice: "npc"
    },
    "mushroomstaff": {
        destroyBelowLevel: 1
    },
    "offering": {
        hold: ["merchant"],
        // TODO: What slot?
    },
    "offeringp": {
        hold: ["merchant"],
        // TODO: What slot?
    },
    "pants": {
        destroyBelowLevel: 1
    },
    "pants1": {
        destroyBelowLevel: 1
    },
    "phelmet": {
        destroyBelowLevel: 1
    },
    "pickaxe": {
        hold: ["merchant"],
        sell: true,
        sellPrice: 1_000_000
    },
    "pmaceofthedead": {
        destroyBelowLevel: 1
    },
    "pouchbow": {
        craft: true
    },
    "pumpkinspice": {
        sellExcess: 9999 * 3
    },
    "resistancering": {
        craft: true
    },
    "ringsj": {
        sell: true,
        sellPrice: "npc"
    },
    "rod": {
        hold: ["merchant"],
        sell: true,
        sellPrice: 1_000_000
    },
    "scroll0": {
        hold: ["merchant"],
        holdSlot: 35
    },
    "scroll1": {
        hold: ["merchant"],
        holdSlot: 36
    },
    "scroll2": {
        hold: ["merchant"],
        holdSlot: 37
    },
    "seashell": {
        exchange: true
    },
    "shoes": {
        destroyBelowLevel: 1
    },
    "shoes1": {
        destroyBelowLevel: 1
    },
    "slimestaff": {
        destroyBelowLevel: 1
    },
    "smoke": {
        sellExcess: 200
    },
    "snakeoil": {
        craft: true
    },
    "snowball": {
        sellExcess: 200 * 3
    },
    "snowflakes": {
        craft: true
    },
    "spookyamulet": {
        sellExcess: 5
    },
    "stand0": {
        sell: true,
        sellPrice: "npc"
    },
    "stick": {
        // We can craft sticks at level 9
        upgradeUntilLevel: 9
    },
    "stramulet": {
        sell: true,
        sellPrice: "npc"
    },
    "strearring": {
        sell: true,
        sellPrice: "npc"
    },
    "supercomputer": {
        hold: true
    },
    "tracker": {
        hold: true,
        holdSlot: 41
    },
    "throwingstars": {
        // We use level 0 to craft other stars
        upgradeUntilLevel: 0
    },
    "vboots": {
        destroyBelowLevel: 1
    },
    "vgloves": {
        destroyBelowLevel: 1
    },
    "vitearring": {
        sell: true,
        sellPrice: "npc"
    },
    "vitring": {
        // We use level 2 to craft other rings
        upgradeUntilLevel: 2
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
    "xmace": {
        destroyBelowLevel: 1
    },
    "xpbooster": {
        hold: true
    }
}

/**
 * Programatically adds some additional items to buy
 */
export async function adjustItemConfig(itemConfig: ItemConfig) {
    for (const iN in AL.Game.G.items) {
        const itemName = iN as ItemName
        const gItem = AL.Game.G.items[itemName]
        const config = itemConfig[itemName]
        if (
            config
            && (
                config.buy
                || config.sell
            )
        ) continue // Buy (or sell) is already set, don't change it

        // TODO: Add more logic for things to buy

        if (
            gItem.e // Buy all exchangables
            || gItem.type === "token" // Buy all tokens
            || gItem.type === "bank_key"
            || gItem.type === "dungeon_key" // Buy all keys
            || gItem.tier >= 4 // Buy all super high tier items
            || gItem.name.includes("Darkforge") // Buy all darkforge items
        ) {
            config.buy = true
            config.buyPrice = "ponty"
            continue
        }
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

        if (config.buy) {
            if (config.buyPrice === undefined) {
                console.warn(`${itemName} has no buy price, removing 'buy'`)
                delete config.buy
            } else {
                // Check if an NPC sells it
                for (const npc in AL.Game.G.npcs) {
                    const gNpc = AL.Game.G.npcs[npc as NPCName]
                    if (gNpc.items?.includes(itemName)) {
                        const npcPrice = gItem.g * (gItem.markup ?? 1)
                        if (config.buyPrice === "ponty" || config.buyPrice > npcPrice) {
                            console.warn(`We can buy ${itemName} from ${npc} for ${npcPrice}, reducing from ${config.buyPrice} to ${npcPrice}`)
                            config.buyPrice = npcPrice
                            break
                        }
                    }
                }
            }
        }

        if (config.craft) {
            if (gCraft === undefined) {
                console.warn(`${itemName} is not craftable, removing 'craft'`)
                delete config.craft
            }
        }

        if (config.exchange) {
            if (gItem.e === undefined) {
                console.warn(`${itemName} is not exchangable, removing 'exchange'`)
                delete config.exchange
            } else if ((gItem.upgrade || gItem.compound) && config.exchangeAtLevel === undefined) {
                console.warn(`${itemName} is compoundable / upgradable, but is missing exchangeAtLevevl, removing 'exchange'`)
                delete config.exchange
            }
        }

        if (config.hold) {
            if (config.holdSlot !== undefined) {
                if (config.holdSlot > 41) {
                    console.warn(`${itemName} cannot be put in to slot ${config.holdSlot}, removing 'slot: ${config.holdSlot}'`)
                    delete config.holdSlot
                } else {
                    if (holdSlots.has(config.holdSlot)) {
                        console.warn(`${itemName} overlaps with ${holdSlots.get(config.holdSlot)} hold_slot, removing '${config.holdSlot}'`)
                        delete config.holdSlot
                    } else {
                        holdSlots.set(config.holdSlot, itemName)
                    }
                }
            }

            if (config.sell && config.sellPrice == "npc") {
                console.warn(`${itemName} has 'hold' and 'sellPrice' set to 'npc', removing 'sell: true'`)
                delete config.sell
            }
        }

        if (config.sell) {
            if (config.sellPrice === undefined) {
                console.warn(`${itemName} has no sell price, removing 'sell: true'`)
                delete config.sell
            } else if (typeof config.sellPrice === "number") {
                if (config.sellPrice < gItem.g) {
                    console.warn(`${itemName} has a lower sell price than G, increasing from ${config.sellPrice} to ${gItem.g}`)
                    config.sellPrice = gItem.g
                }
                if (config.destroyBelowLevel) {
                    console.warn(`${itemName} has both 'sell' and 'destroyBelowLevel' set, removing 'sell: true'`)
                    delete config.sell
                }
            } else if (config.sellPrice == "npc") {
                if (config.destroyBelowLevel) {
                    console.warn(`${itemName} has both 'sell' and 'destroyBelowLevel' set, removing 'sell: true'`)
                    delete config.sell
                }
            } else if (Array.isArray(config.sellPrice)) {
                for (const level in config.sellPrice) {
                    const sellPrice = config.sellPrice[level]
                    const itemInfo = new Item({ name: itemName, level: parseInt(level) }, AL.Game.G)
                    const npcValue = itemInfo.calculateNpcValue()
                    if (sellPrice < npcValue) {
                        console.warn(`${itemName} @ level ${level} has a lower sell price than NPC, increasing from ${sellPrice} to ${npcValue}`)
                        config.sellPrice = npcValue
                    }
                }
                if (config.destroyBelowLevel) {
                    for (let level = 0; level < config.destroyBelowLevel; level++) {
                        if (config.sellPrice[level] === undefined) continue
                        console.warn(`${itemName} has both 'sell' and 'destroyBelowLevel' set, removing 'config.sellPrice[${level}]'`)
                        delete config.sellPrice[level]
                    }
                }
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

        if (config.destroyBelowLevel) {
            if (!gItem.upgrade) {
                console.warn(`${itemName} has 'destroyBelowLevel' but is not upgradable, removing 'destroyBelowLevel'`)
                delete config.destroyBelowLevel
            }
        }
    }
}