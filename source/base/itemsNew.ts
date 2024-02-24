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
    "basher": {
        destroyBelowLevel: 1
    },
    "basketofeggs": {
        craft: true,
        exchange: true
    },
    "bataxe": {
        destroyBelowLevel: 1
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
    "blade": {
        destroyBelowLevel: 1
    },
    "bow": {
        destroyBelowLevel: 1
    },
    "bowofthedead": {
        destroyBelowLevel: 1
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
    "candycanesword": {
        destroyBelowLevel: 1
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
    "claw": {
        destroyBelowLevel: 1
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
    "crossbow": {
        usePrimlingFromLevel: 4,
        useOfferingFromLevel: 7
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
    "cupid": {
        destroyBelowLevel: 1
    },
    "dagger": {
        destroyBelowLevel: 1
    },
    "daggerofthedead": {
        destroyBelowLevel: 1
    },
    "dexring": {
        sell: true,
        sellPrice: "npc"
    },
    "ecape": {
        destroyBelowLevel: 1
    },
    "eears": {
        destroyBelowLevel: 1
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
    "fireblade": {
        destroyBelowLevel: 1
    },
    "firestaff": {
        destroyBelowLevel: 1
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
    "fury": {
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 2
    },
    "gcape": {
        destroyBelowLevel: 1
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
    "harmor": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 9,
    },
    "hboots": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 9,
    },
    "hbow": {
        destroyBelowLevel: 1
    },
    "helmet": {
        destroyBelowLevel: 1
    },
    "helmet1": {
        destroyBelowLevel: 1
    },
    "hgloves": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 9,
    },
    "hhelmet": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 9,
    },
    "hotchocolate": {
        sellExcess: 9999 * 3
    },
    "hpamulet": {
        sell: true,
        sellPrice: "npc"
    },
    "hpants": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 9,
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
    "mace": {
        destroyBelowLevel: 1
    },
    "maceofthedead": {
        destroyBelowLevel: 1
    },
    "merry": {
        destroyBelowLevel: 1
    },
    "mistletoe": {
        exchange: true
    },
    "mittens": {
        destroyBelowLevel: 1
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
    "ornamentstaff": {
        destroyBelowLevel: 1
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
    "pmace": {
        destroyBelowLevel: 1
    },
    "pmaceofthedead": {
        destroyBelowLevel: 1
    },
    "pouchbow": {
        craft: true,
        destroyBelowLevel: 1
    },
    "pumpkinspice": {
        sellExcess: 9999 * 3
    },
    "pyjamas": {
        destroyBelowLevel: 1
    },
    "quiver": {
        destroyBelowLevel: 1
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
    "spear": {
        destroyBelowLevel: 1
    },
    "spookyamulet": {
        sellExcess: 5
    },
    "staff": {
        destroyBelowLevel: 1
    },
    "staffofthedead": {
        destroyBelowLevel: 1
    },
    "stand0": {
        sell: true,
        sellPrice: "npc"
    },
    "starkillers": {
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 2
    },
    "stick": {
        // We can craft sticks at level 9
        upgradeUntilLevel: 9
    },
    "stinger": {
        destroyBelowLevel: 1
    },
    "stramulet": {
        sell: true,
        sellPrice: "npc"
    },
    "strearring": {
        sell: true,
        sellPrice: "npc"
    },
    "suckerpunch": {
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 2
    },
    "supercomputer": {
        hold: true
    },
    "supermittens": {
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 2
    },
    "swifty": {
        destroyBelowLevel: 1
    },
    "sword": {
        destroyBelowLevel: 1
    },
    "swordofthedead": {
        destroyBelowLevel: 1
    },
    "t2bow": {
        destroyBelowLevel: 1
    },
    "t3bow": {
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 2
    },
    "test_orb": {
        upgradeUntilLevel: 0
    },
    "tigerhelmet": {
        destroyBelowLevel: 1
    },
    "tracker": {
        hold: true,
        holdSlot: 41
    },
    "throwingstars": {
        // We use level 0 to craft other stars
        upgradeUntilLevel: 0
    },
    "vattire": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4
    },
    "vboots": {
        destroyBelowLevel: 1
    },
    "vcape": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4
    },
    "vdagger": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4
    },
    "vgloves": {
        destroyBelowLevel: 1
    },
    "vhammer": {
        buy: true,
        buyPrice: "ponty",
        sell: true,
        sellPrice: 100_000_000,
        upgradeUntilLevel: 0
    },
    "vitearring": {
        sell: true,
        sellPrice: "npc"
    },
    "vitring": {
        // We use level 2 to craft other rings
        upgradeUntilLevel: 2
    },
    "wand": {
        destroyBelowLevel: 1
    },
    "warmscarf": {
        destroyBelowLevel: 1
    },
    "wattire": {
        craft: true,
        destroyBelowLevel: 1
    },
    "wbasher": {
        destroyBelowLevel: 1
    },
    "wbreeches": {
        craft: true,
        destroyBelowLevel: 1
    },
    "wcap": {
        craft: true,
        destroyBelowLevel: 1
    },
    "weaponbox": {
        exchange: true
    },
    "wgloves": {
        craft: true,
        destroyBelowLevel: 1
    },
    "wingedboots": {
        craft: true
    },
    "wshoes": {
        craft: true,
        destroyBelowLevel: 1
    },
    "xarmor": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4
    },
    "xboots": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4
    },
    "xbox": {
        craft: true
    },
    "xgloves": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4
    },
    "xhelmet": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4
    },
    "xmace": {
        destroyBelowLevel: 1
    },
    "xmashat": {
        destroyBelowLevel: 1
    },
    "xmaspants": {
        destroyBelowLevel: 1
    },
    "xmasshoes": {
        destroyBelowLevel: 1
    },
    "xmassweater": {
        destroyBelowLevel: 1
    },
    "xpants": {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4
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
        let config = itemConfig[itemName]
        if (
            config
            && (
                config.buy
                || config.sell
            )
        ) continue // Buy (or sell) is already set, don't change it

        if (!config) config = {}

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

        if (Object.keys(config).length === 0) {
            // Remove it from our config
            delete itemConfig[itemName]
        } else {
            // Make sure it's in our config
            itemConfig[itemName] = config
        }
    }

    // TODO: If we are selling things for more than ponty price,
    //       Add buy with buyPrice: "ponty" unless "buy" is already set

    // TODO: If we are using primlings on things,
    //       Add buy with buyPrice: "ponty" unless "buy" is already set
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