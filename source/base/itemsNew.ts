import AL, { Character, CharacterType, Item, ItemData, ItemName, NPCName } from "alclient"
import { TradeItem } from "alclient/build/TradeItem.js"
import { checkOnlyEveryMS } from "./general.js"

// TODO: Figure out how to require buy_price if buy is set
export type BuyConfig = {
    /** If set, we should try to buy it from other players or NPCs */
    buy?: true
    /** If set, we should list it to buy on our stand */
    list?: true
    /**
     * Maximum price to pay for the item.
     *
     * If set to a number, we should buy it for that much at level 0.
     *
     * If set to 'ponty', we should buy it for as much as ponty is selling it for (G * multipliers.secondhands_mult).
     *
     * TODO: Add support for ` | { [T in number]: number }`
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

export type MailConfig = {
    mail?: true
    mailTo?: string
}

// TODO: Figure out how to require sell_price if sell is set
export type SellConfig = {
    /** If set, we should sell it to other players or NPCs */
    sell?: true
    /** If set, we should list it for sale on our stand */
    list?: true
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
    useScroll1FromLevel?: number
    useScroll2FromLevel?: number
    useScroll3FromLevel?: number
}

export type CombinedConfig = BuyConfig &
    CraftConfig &
    ExchangeConfig &
    HoldConfig &
    MailConfig &
    SellConfig &
    UpgradeConfig
export type ItemConfig = Partial<Record<ItemName, CombinedConfig>>

const SELL_TO_NPC: SellConfig = {
    sell: true,
    sellPrice: "npc",
}

export const REPLENISH_ITEM_CONFIG: ItemConfig = {
    hpot1: {
        hold: true,
        holdSlot: 39,
        replenish: 1000,
    },
    mpot1: {
        hold: true,
        holdSlot: 38,
        replenish: 1000,
    },
    offering: {
        hold: ["merchant"],
        replenish: 1,
    },
    xptome: {
        hold: true,
        replenish: 1,
    },
}

export const DEFAULT_ITEM_CONFIG: ItemConfig = {
    ...REPLENISH_ITEM_CONFIG,
    "5bucks": {
        buy: true,
        buyPrice: 100_000_000,
    },
    amuletofm: {
        buy: true,
        buyPrice: 500_000_000,
        useOfferingFromLevel: 0,
    },
    angelwings: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 8,
        upgradeUntilLevel: 8, // TODO: We need to stack a bunch of primlings at 8
    },
    armorbox: {
        buy: true,
        buyPrice: "ponty",
        exchange: true,
    },
    armorring: {
        buy: true,
        buyPrice: 1_000_000,
        craft: true,
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 3,
        useScroll2FromLevel: 2,
        useScroll3FromLevel: 5,
    },
    basher: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 8,
        useScroll3FromLevel: 9,
        upgradeUntilLevel: 9, // TODO: We need to stack a bunch of primlings at 9
    },
    basketofeggs: {
        craft: true,
        exchange: true,
    },
    bcape: {
        // We can craft other capes at level 7
        upgradeUntilLevel: 7,
        usePrimlingFromLevel: 3,
        useOfferingFromLevel: 6,
    },
    bfangamulet: {
        buy: true,
        buyPrice: "ponty",
        craft: true,
        useOfferingFromLevel: 0,
        useScroll3FromLevel: 3,
    },
    blade: {
        sellExcess: 5,
        upgradeUntilLevel: 0,
    },
    bow: {
        sellExcess: 5,
        upgradeUntilLevel: 0,
    },
    cake: {
        craft: true,
        ...SELL_TO_NPC,
    },
    /** Blue Candy */
    // candy0: {
    //     exchange: true,
    // },
    /** Pink Candy */
    // candy1: {
    //     exchange: true,
    // },
    // candycane: {
    //     exchange: true,
    // },
    candycanesword: {
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 9,
        upgradeUntilLevel: 9, // TODO: We need to stack a bunch of primlings at 9
    },
    candypop: {
        exchange: true,
    },
    carrotsword: {
        craft: true,
        sell: true, // We get way too many during christmas
        // usePrimlingFromLevel: 7,
        // useOfferingFromLevel: 8,
        // upgradeUntilLevel: 8, // TODO: We need to stack a bunch of primlings at 8
    },
    cclaw: {
        buy: true,
        buyPrice: "ponty",
        craft: true,
    },
    cdragon: {
        sellExcess: 5,
    },
    cearring: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4,
        useScroll2FromLevel: 3,
    },
    charmer: {
        craft: true,
        upgradeUntilLevel: 1,
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 3,
        useScroll2FromLevel: 1,
        useScroll3FromLevel: 4,
    },
    claw: {
        sellExcess: 5,
        upgradeUntilLevel: 0,
    },
    coat: {
        ...SELL_TO_NPC,
    },
    coat1: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 8,
        upgradeUntilLevel: 9, // TODO: We need to stack a bunch of primlings at 9
    },
    computer: {
        hold: true,
        holdSlot: 40,
    },
    cring: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4,
        useScroll2FromLevel: 3,
    },
    crossbow: {
        usePrimlingFromLevel: 6,
        useOfferingFromLevel: 8,
        useScroll2FromLevel: 6,
        upgradeUntilLevel: 9, // TODO: We need to stack a bunch of primlings at 9
    },
    cscroll0: {
        hold: ["merchant"],
        holdSlot: 28,
    },
    cscroll1: {
        hold: ["merchant"],
        holdSlot: 29,
    },
    cscroll2: {
        hold: ["merchant"],
        holdSlot: 30,
    },
    dagger: {
        ...SELL_TO_NPC,
    },
    dexamulet: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 3,
        useOfferingFromLevel: 5,
    },
    dexbelt: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 2,
        useOfferingFromLevel: 5,
        useScroll2FromLevel: 4,
    },
    dexearring: {
        buy: true,
        buyPrice: "ponty",
    },
    dexearringx: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 2,
        useScroll2FromLevel: 1,
        useScroll3FromLevel: 3,
    },
    dexring: {
        ...SELL_TO_NPC,
    },
    eears: {
        ...SELL_TO_NPC,
    },
    eggnog: {
        sellExcess: 9999 * 3,
    },
    elixirdex1: {
        craft: true,
    },
    elixirdex2: {
        craft: true,
    },
    elixirint1: {
        craft: true,
    },
    elixirint2: {
        craft: true,
    },
    elixirstr1: {
        craft: true,
    },
    elixirstr2: {
        craft: true,
    },
    elixirvit1: {
        craft: true,
    },
    elixirvit2: {
        craft: true,
    },
    epyjamas: {
        ...SELL_TO_NPC,
    },
    eslippers: {
        ...SELL_TO_NPC,
    },
    essenceoflife: {
        sellExcess: 9999 * 5,
    },
    exoarm: {
        buy: true,
        buyPrice: 250_000_000,
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 1,
    },
    fallen: {
        buy: true,
        buyPrice: 100_000_000,
        upgradeUntilLevel: 0,
    },
    fieldgen0: {
        sell: true,
        sellPrice: 5_000_000,
        sellExcess: 20,
    },
    fireblade: {
        buy: true,
        buyPrice: "ponty",
    },
    firestaff: {
        buy: true,
        buyPrice: "ponty",
    },
    firestars: {
        buy: true,
        buyPrice: "ponty",
        craft: true,
    },
    frankypants: {
        ...SELL_TO_NPC,
    },
    // frostbow: {
    //     craft: true,
    // },
    // froststaff: {
    //     craft: true,
    // },
    fury: {
        buy: true,
        buyPrice: 100_000_000,
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 4,
        useScroll3FromLevel: 6,
        upgradeUntilLevel: 3, // TODO: We need to stack a bunch of primlings at 3
    },
    gcape: {
        useOfferingFromLevel: 8,
        upgradeUntilLevel: 8, // TODO: We need to stack a bunch of primlings at 8
    },
    gem0: {
        /** Green Gem */
        exchange: true,
    },
    // gem1: {
    //     /** Red Gem */
    //     exchange: true,
    // },
    gemfragment: {
        exchange: true,
    },
    glolipop: {
        ...SELL_TO_NPC,
    },
    gloves: {
        ...SELL_TO_NPC,
    },
    gloves1: {
        buy: true,
        buyPrice: "ponty",
        upgradeUntilLevel: 9,
    },
    goldbooster: {
        hold: true,
    },
    gphelmet: {
        ...SELL_TO_NPC,
    },
    greenenvelope: {
        exchange: true,
    },
    harbringer: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 8,
        upgradeUntilLevel: 8, // TODO: We need to stack a bunch of primlings at 8
        useScroll3FromLevel: 9,
    },
    harmor: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 4,
        useOfferingFromLevel: 6,
        upgradeUntilLevel: 6, // TODO: We need to stack a bunch of primlings at 6
    },
    hboots: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 4,
        useOfferingFromLevel: 6,
        upgradeUntilLevel: 6, // TODO: We need to stack a bunch of primlings at 6
    },
    helmet: {
        ...SELL_TO_NPC,
    },
    helmet1: {
        buy: true,
        buyPrice: "ponty",
        upgradeUntilLevel: 9,
    },
    hgloves: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 4,
        useOfferingFromLevel: 6,
        upgradeUntilLevel: 6, // TODO: We need to stack a bunch of primlings at 6
    },
    hhelmet: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 4,
        useOfferingFromLevel: 6,
        upgradeUntilLevel: 6, // TODO: We need to stack a bunch of primlings at 6
    },
    hotchocolate: {
        sellExcess: 9999 * 3,
    },
    hpamulet: {
        ...SELL_TO_NPC,
    },
    hpants: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 4,
        useOfferingFromLevel: 6,
        upgradeUntilLevel: 6, // TODO: We need to stack a bunch of primlings at 6
    },
    hpbelt: {
        ...SELL_TO_NPC,
    },
    hpot0: {
        // sell: true,
        // sellPrice: "npc"
        sellExcess: 9999,
    },
    iceskates: {
        ...SELL_TO_NPC,
    },
    intamulet: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 3,
        useOfferingFromLevel: 5,
    },
    intbelt: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 2,
        useOfferingFromLevel: 5,
        useScroll2FromLevel: 4,
    },
    intearring: {
        ...SELL_TO_NPC,
    },
    intring: {
        ...SELL_TO_NPC,
    },
    jacko: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4,
        useScroll2FromLevel: 3,
    },
    lantern: {
        buy: true,
        buyPrice: "ponty",
        sell: true,
        sellPrice: 2_000_000,
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 2,
        useScroll3FromLevel: 5,
    },
    // "lbelt": {
    //     craft: true
    // },
    leather: {
        exchange: true,
    },
    lostearring: {
        exchange: true,
        exchangeAtLevel: 2,
        upgradeUntilLevel: 2,
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 3,
    },
    luckbooster: {
        hold: true,
    },
    mace: {
        ...SELL_TO_NPC,
    },
    mearring: {
        buy: true,
        buyPrice: 50_000_000,
        useOfferingFromLevel: 0,
        useScroll3FromLevel: 3,
    },
    merry: {
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 9,
        upgradeUntilLevel: 9, // TODO: We need to stack a bunch of primlings at 9
    },
    // mistletoe: {
    //     exchange: true,
    // },
    // monstertoken: {
    //     sell: true,
    //     sellPrice: 350_000,
    // },
    mittens: {
        usePrimlingFromLevel: 8,
        useOfferingFromLevel: 9,
        upgradeUntilLevel: 9, // TODO: We need to stack a bunch of primlings at 9
    },
    mpot0: {
        // sell: true,
        // sellPrice: "npc"
        sellExcess: 9999,
    },
    mpxamulet: {
        buy: true,
        buyPrice: 500_000_000,
        useOfferingFromLevel: 0,
        useScroll3FromLevel: 3,
    },
    mpxgloves: {
        buy: true,
        buyPrice: 500_000_000,
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 5,
        upgradeUntilLevel: 3, // TODO: We need to stack a bunch of primlings at 3
    },
    mshield: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 3,
        useOfferingFromLevel: 6,
        useScroll3FromLevel: 8,
        upgradeUntilLevel: 6, // TODO: We need to stack a bunch of primlings at 6
    },
    mushroomstaff: {
        ...SELL_TO_NPC,
    },
    northstar: {
        buy: true,
        buyPrice: 250_000_000,
        useOfferingFromLevel: 0,
    },
    offering: {
        hold: ["merchant"],
    },
    offeringp: {
        hold: ["merchant"],
        buy: true,
        buyPrice: 2_500_000,
    },
    orba: {
        craft: true,
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 2,
        useScroll3FromLevel: 5,
    },
    orboffire: {
        upgradeUntilLevel: 0,
        buy: true,
        buyPrice: "ponty",
    },
    orboffrost: {
        upgradeUntilLevel: 0,
        buy: true,
        buyPrice: "ponty",
    },
    orbofplague: {
        upgradeUntilLevel: 0,
        buy: true,
        buyPrice: "ponty",
    },
    orbofresolve: {
        upgradeUntilLevel: 0,
        buy: true,
        buyPrice: "ponty",
    },
    ornament: {
        exchange: true,
    },
    ornamentstaff: {
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 8,
        upgradeUntilLevel: 8, // TODO: We need to stack a bunch of primlings at 8
    },
    pants: {
        ...SELL_TO_NPC,
    },
    pants1: {
        buy: true,
        buyPrice: "ponty",
        upgradeUntilLevel: 9,
    },
    phelmet: {
        ...SELL_TO_NPC,
    },
    pickaxe: {
        hold: ["merchant"],
        sell: true,
        sellPrice: 1_000_000,
        usePrimlingFromLevel: 6,
        useOfferingFromLevel: 9,
        useScroll1FromLevel: 2,
        useScroll2FromLevel: 7,
        upgradeUntilLevel: 10, // TODO: We need to stack a bunch of primlings at 10
    },
    pinkie: {
        buy: true,
        buyPrice: "ponty",
    },
    // pouchbow: {
    //     craft: true,
    // },
    pumpkinspice: {
        sellExcess: 9999 * 3,
        hold: true,
    },
    pyjamas: {
        ...SELL_TO_NPC,
    },
    quiver: {
        usePrimlingFromLevel: 8,
        useOfferingFromLevel: 9,
        upgradeUntilLevel: 10, // TODO: We need to stack a bunch of primlings at 10
    },
    rabbitsfoot: {
        useOfferingFromLevel: 0,
        useScroll2FromLevel: 0,
        useScroll3FromLevel: 3,
    },
    rapier: {
        buy: true,
        buyPrice: "ponty",
    },
    rednose: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 3,
        useOfferingFromLevel: 4,
    },
    resistancering: {
        craft: true,
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 3,
        useScroll2FromLevel: 2,
        useScroll3FromLevel: 5,
    },
    ringhs: {
        buy: true,
        buyPrice: 50_000_000,
        useOfferingFromLevel: 0,
        useScroll3FromLevel: 3,
    },
    ringofluck: {
        buy: true,
        buyPrice: 100_000_000,
        useOfferingFromLevel: 0,
        useScroll3FromLevel: 3,
    },
    ringsj: {
        ...SELL_TO_NPC,
    },
    rod: {
        hold: ["merchant"],
        sell: true,
        sellPrice: 1_000_000,
        usePrimlingFromLevel: 6,
        useOfferingFromLevel: 9,
        useScroll1FromLevel: 2,
        useScroll2FromLevel: 7,
        upgradeUntilLevel: 10, // TODO: We need to stack a bunch of primlings at 10
    },
    sanguine: {
        buy: true,
        buyPrice: 500_000_000,
        useOfferingFromLevel: 0,
    },
    santasbelt: {
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4,
    },
    scroll0: {
        hold: ["merchant"],
        holdSlot: 35,
    },
    scroll1: {
        hold: ["merchant"],
        holdSlot: 36,
    },
    scroll2: {
        hold: ["merchant"],
        holdSlot: 37,
    },
    seashell: {
        exchange: true,
    },
    shoes: {
        sellExcess: 1,
        upgradeUntilLevel: 0,
    },
    shoes1: {
        buy: true,
        buyPrice: "ponty",
        upgradeUntilLevel: 9,
    },
    skullamulet: {
        ...SELL_TO_NPC,
    },
    slimestaff: {
        ...SELL_TO_NPC,
    },
    smoke: {
        sellExcess: 200,
    },
    snakeoil: {
        craft: true,
    },
    snowball: {
        sellExcess: 200 * 3,
    },
    snowflakes: {
        buy: true,
        buyPrice: "ponty",
        craft: true,
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 8,
        upgradeUntilLevel: 8, // TODO: We need to stack a bunch of primlings at 8
    },
    snring: {
        buy: true,
        buyPrice: 250_000_000,
        useOfferingFromLevel: 0,
        useScroll3FromLevel: 3,
    },
    spear: {
        ...SELL_TO_NPC,
    },
    spookyamulet: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 3,
        useScroll2FromLevel: 2,
        useScroll3FromLevel: 5,
    },
    staff: {
        sellExcess: 5,
        upgradeUntilLevel: 0,
    },
    stand0: {
        ...SELL_TO_NPC,
    },
    starkillers: {
        buy: true,
        buyPrice: 250_000_000,
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 5,
        useScroll3FromLevel: 7,
        upgradeUntilLevel: 3, // TODO: We need to stack a bunch of primlings at 3
    },
    stick: {
        // We can craft sticks at level 9
        upgradeUntilLevel: 9,
    },
    stinger: {
        ...SELL_TO_NPC,
    },
    stramulet: {
        ...SELL_TO_NPC,
    },
    strbelt: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 2,
        useOfferingFromLevel: 5,
        useScroll2FromLevel: 4,
    },
    strearring: {
        ...SELL_TO_NPC,
    },
    suckerpunch: {
        buy: true,
        buyPrice: 250_000_000,
        useOfferingFromLevel: 0,
        useScroll3FromLevel: 3,
    },
    supercomputer: {
        hold: true,
    },
    supermittens: {
        buy: true,
        buyPrice: 100_000_000,
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 2,
        upgradeUntilLevel: 3, // TODO: We need to stack a bunch of primlings at 3
    },
    sweaterhs: {
        usePrimlingFromLevel: 7,
        useOfferingFromLevel: 8,
        upgradeUntilLevel: 8, // TODO: We need to stack a bunch of primlings at 8
    },
    swifty: {
        ...SELL_TO_NPC,
    },
    sword: {
        sellExcess: 5,
    },
    t2quiver: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useScroll2FromLevel: 3,
        upgradeUntilLevel: 6, // TODO: We need to stack a bunch of primlings at 6
    },
    t3bow: {
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 2,
    },
    test_orb: {
        upgradeUntilLevel: 0,
    },
    throwingstars: {
        // We use level 0 to craft other stars
        // buy: true,
        // buyPrice: "ponty",
        upgradeUntilLevel: 0,
        sellExcess: 10,
    },
    tracker: {
        hold: true,
        holdSlot: 41,
    },
    trigger: {
        buy: true,
        buyPrice: 500_000_000,
        useOfferingFromLevel: 0,
    },
    troll: {
        buy: true,
        buyPrice: "ponty",
        exchange: true,
    },
    tshirt3: {
        // xp
        buy: true,
        buyPrice: "ponty",
    },
    tshirt4: {
        // speed
        buy: true,
        buyPrice: "ponty",
    },
    tshirt6: {
        // rpierce
        buy: true,
        buyPrice: "ponty",
    },
    tshirt7: {
        // apierce
        buy: true,
        buyPrice: "ponty",
    },
    tshirt8: {
        // attack mp cost
        buy: true,
        buyPrice: "ponty",
    },
    tshirt88: {
        // lucky
        upgradeUntilLevel: 0,
    },
    tshirt9: {
        // manasteal
        upgradeUntilLevel: 0,
    },
    vattire: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4,
    },
    vcape: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4,
    },
    vdagger: {
        buy: true,
        buyPrice: "ponty",
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 4,
    },
    vhammer: {
        buy: true,
        buyPrice: "ponty",
        mail: true,
        mailTo: "Diocles",
        // sell: true,
        // sellPrice: 100_000_000,
        upgradeUntilLevel: 0,
        // usePrimlingFromLevel: 1,
        // useOfferingFromLevel: 4,
    },
    vitearring: {
        ...SELL_TO_NPC,
    },
    vitring: {
        upgradeUntilLevel: 2,
    },
    vorb: {
        buy: true,
        buyPrice: 250_000_000,
        useOfferingFromLevel: 0,
    },
    vring: {
        buy: true,
        buyPrice: 25_000_000,
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 1,
        useScroll3FromLevel: 3,
    },
    warmscarf: {
        ...SELL_TO_NPC,
    },
    wattire: {
        buy: true,
        buyPrice: "ponty",
        craft: true,
    },
    wblade: {
        buy: true,
        buyPrice: 500_000_000,
        useOfferingFromLevel: 0,
    },
    wbook0: {
        usePrimlingFromLevel: 3,
        useOfferingFromLevel: 4,
    },
    wbook1: {
        usePrimlingFromLevel: 0,
        useOfferingFromLevel: 2,
        useScroll2FromLevel: 1,
        useScroll3FromLevel: 4,
    },
    wbookhs: {
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 2,
    },
    wbreeches: {
        buy: true,
        buyPrice: "ponty",
        craft: true,
        usePrimlingFromLevel: 8,
        useOfferingFromLevel: 10,
        useScroll2FromLevel: 8,
        upgradeUntilLevel: 10, // TODO: We need to stack a bunch of primlings at 10
    },
    wcap: {
        buy: true,
        buyPrice: "ponty",
        craft: true,
    },
    weaponbox: {
        exchange: true,
    },
    wgloves: {
        buy: true,
        buyPrice: "ponty",
        craft: true,
        usePrimlingFromLevel: 9,
        useOfferingFromLevel: 10,
        upgradeUntilLevel: 10, // TODO: We need to stack a bunch of primlings at 10
    },
    wingedboots: {
        craft: true,
    },
    wshoes: {
        buy: true,
        buyPrice: "ponty",
        craft: true,
    },
    xarmor: {
        buy: true,
        buyPrice: 15_000_000,
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 5,
        upgradeUntilLevel: 5, // TODO: We need to stack a bunch of primlings at 5
    },
    xboots: {
        buy: true,
        buyPrice: 15_000_000,
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 5,
        upgradeUntilLevel: 5, // TODO: We need to stack a bunch of primlings at 5
    },
    xbox: {
        craft: true,
    },
    xgloves: {
        buy: true,
        buyPrice: 15_000_000,
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 5,
        upgradeUntilLevel: 5, // TODO: We need to stack a bunch of primlings at 5
    },
    xhelmet: {
        buy: true,
        buyPrice: 15_000_000,
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 5,
        upgradeUntilLevel: 5, // TODO: We need to stack a bunch of primlings at 5
    },
    xmace: {
        ...SELL_TO_NPC,
    },
    xmashat: {
        ...SELL_TO_NPC,
    },
    xmaspants: {
        ...SELL_TO_NPC,
    },
    xmasshoes: {
        ...SELL_TO_NPC,
    },
    xmassweater: {
        ...SELL_TO_NPC,
    },
    xpants: {
        buy: true,
        buyPrice: 15_000_000,
        usePrimlingFromLevel: 1,
        useOfferingFromLevel: 5,
        upgradeUntilLevel: 5, // TODO: We need to stack a bunch of primlings at 5
    },
    xpbooster: {
        hold: true,
    },
    xshield: {
        buy: true,
        buyPrice: 50_000_000,
        useOfferingFromLevel: 0,
    },
    yorick: {
        buy: true,
        buyPrice: "ponty",
    },
    zapper: {
        buy: true,
        buyPrice: 500_000_000,
        useOfferingFromLevel: 0,
    },
} as ItemConfig // TODO: Add new items to ALClient

export function wantToDestroy(itemConfig: ItemConfig, item: ItemData): boolean {
    if (item.l) return false // Locked
    if (item.level === undefined) return false // Item has no level, there's no point destroying it

    const config = itemConfig[item.name]
    if (!config) return false // No config
    if (config.destroyBelowLevel === undefined) return false // Don't want to destroy

    return item.level < config.destroyBelowLevel
}

export function wantToExchange(itemConfig: ItemConfig, item: Item): boolean {
    if (item.l) return false // Locked
    if (!item.e) return false // Not exchangable

    const config = itemConfig[item.name]
    if (!config) return false // No config
    if (!config.exchange) return false // Don't want to exchange
    if (config.exchangeAtLevel !== undefined && item.level !== config.exchangeAtLevel) return false // We don't want to exchange it at this level

    if ((item.e ?? 1) > (item.q ?? 1)) return false // We don't have enough to exchange

    return true
}

export function wantToHold(itemConfig: ItemConfig, item: ItemData, bot: Character): boolean {
    if (item.l) return true // We want to hold locked items

    const config = itemConfig[item.name]
    if (!config) return false // No config
    if (!config.hold) return false
    if (config.hold === true) return true
    if (config.hold.includes(bot.ctype)) return true

    return false
}

export function wantToMail(itemConfig: ItemConfig, item: ItemData) {
    if (item.l) return false // Don't send locked items
    if (item.p) return false // Don't sell special items
    if (item.level) return false // Don't mail leveled items

    const config = itemConfig[item.name]
    if (!config) return false // No config

    if (config.mail) return true
}

export function wantToSellToPlayer(itemConfig: ItemConfig, item: TradeItem) {
    // NOTE: Don't add a hold check here, if we want to sell, but also hold it, it's fine to sell.
    if (item.p) return false // Don't sell special items

    const config = itemConfig[item.name]

    if (!config) return false // No config
    if (!config.sell) return false // We don't want to sell

    if (typeof config.sellPrice === "number") {
        if ((item.level ?? 0) > 0) return false // We're not selling this item if leveled
        if (config.sellPrice > item.price) return false // We want more for it
    } else if (config.sellPrice === "npc") {
        if ((item.level ?? 0) > 0) return false // We're not selling this item if leveled
        if (item.calculateNpcValue() > item.price) return false // We want more for it
    } else {
        if (!config.sellPrice[item.level ?? 0]) return false // We're not selling this item at this level
        if (config.sellPrice[item.level ?? 0] > item.price) return false // We want more for it
    }

    return true
}

export function wantToSellToNpc(
    itemConfig: ItemConfig,
    item: Item,
    bot: Character,
    itemCounts: ItemCounts = null,
): boolean {
    if (wantToHold(itemConfig, item, bot)) return false
    if (item.p) return false // We don't want to sell special items to NPCs

    const config = itemConfig[item.name]
    if (!config) return false // No config

    if (config.sellExcess && itemCounts) {
        const levelCounts = itemCounts.get(item.name)
        if (levelCounts === undefined) return false // We don't have count information for this item

        const entries = [...levelCounts.entries()]
        entries.sort((a, b) => (b[0] ?? 0) - (a[0] ?? 0)) // Sort highest level first
        let numItem = 0
        for (const [level, countData] of entries) {
            numItem += countData.q
            if (numItem <= config.sellExcess) {
                if (item.level && item.level >= level) return false // We don't have an excess at this or a higher level
                continue // We don't have an excess yet
            }
            // TODO: Add logic to check if there are players buying for more than NPC
            return true // We have an excess, we can sell this item
        }
        return false
    }

    if (!config.sell) return false // Don't want to sell

    const npcValue = item.calculateNpcValue()
    if (config.sellPrice === "npc" && (item.level ?? 0) === 0) return true
    if (typeof config.sellPrice === "number" && npcValue >= config.sellPrice) return true
    if (config.sellPrice[item.level] && npcValue >= config.sellPrice[item.level]) return true

    // TODO: Add logic to check if there are players buying for more than NPC
    return false
}

export function wantToUpgrade(item: Item, itemConfig: UpgradeConfig, itemCounts: ItemCounts): boolean {
    if (item.l) return false // Locked

    if (!item.upgrade && !item.compound) return false // Not upgradable or compoundable

    if (itemConfig) {
        if (item.level < itemConfig.destroyBelowLevel) return false // We want to destroy it
        if (itemConfig.upgradeUntilLevel !== undefined && item.level >= itemConfig.upgradeUntilLevel) return false // We don't want to upgrade it any further
    }

    const levelCounts = itemCounts.get(item.name)
    if (levelCounts === undefined) return false // We don't have count information for this item

    // Count how many we have of the given item at the same level or higher
    let numItem = 0
    for (const [level, levelCount] of levelCounts) {
        if (level < item.level) continue // Lower level than what we have, don't count it
        numItem += levelCount.q
    }

    // Count how many we would like to have to equip all of our characters with it
    let classMultiplier = 4
    if (item.class?.length == 1) {
        if (item.class[0] == "merchant") {
            classMultiplier = 1
        } else {
            classMultiplier = 3
        }
    }
    let numEquippableMultiplier = 1
    if (item.type == "ring" || item.type == "earring") {
        numEquippableMultiplier = 2
    } else {
        for (const characterType in AL.Game.G.classes) {
            const cType = characterType as CharacterType
            const gClass = AL.Game.G.classes[cType]
            if (!item.class?.includes(cType)) continue // This weapon can't be used on this character type
            if (gClass.mainhand[item.wtype] && gClass.offhand[item.wtype]) {
                // We can equip two of these on some character type
                numEquippableMultiplier = 2
                break
            }
        }
    }
    let numToKeep = classMultiplier * numEquippableMultiplier
    numToKeep += item.compound ? 2 : 0 // We need 3 to compound, only compound if we have extra
    if (numItem <= numToKeep) return false // We don't want to lose this item

    return true
}

/**
 * Programatically adds some additional items to buy
 */
export async function adjustItemConfig(itemConfig: ItemConfig) {
    for (const iN in AL.Game.G.items) {
        const itemName = iN as ItemName
        const gItem = AL.Game.G.items[itemName]
        let config = itemConfig[itemName]

        // TODO: Temporary stop buying things we have no money
        if (config && config.buy) {
            delete config.buy
            delete config.buyPrice
            continue
        }

        if (config && (config.buy || config.sell)) continue // Buy (or sell) is already set, don't change it

        if (!config) config = {}

        // TODO: Add more logic for things to buy

        if (
            gItem.e || // Buy all exchangables
            gItem.type === "token" || // Buy all tokens
            gItem.type === "bank_key" ||
            gItem.type === "dungeon_key" || // Buy all keys
            gItem.tier >= 4 || // Buy all super high tier items
            gItem.name.includes("Darkforge") // Buy all darkforge items
        ) {
            // TODO: Temporary stop buying things we have no money
            // config.buy = true
            // config.buyPrice = "ponty"
        }

        // Use primlings and offerings for higher level items
        if (gItem.compound && gItem.grades) {
            let primlingFrom = 3
            if (gItem.grades[1] == 0) {
                // Rare at level 0
                primlingFrom = 1
            } else if (gItem.grades[0] == 0) {
                // High at level 0
                primlingFrom = 2
            }

            if (config.usePrimlingFromLevel === undefined) config.usePrimlingFromLevel = primlingFrom
            if (config.useOfferingFromLevel === undefined) config.useOfferingFromLevel = primlingFrom + 1
        }
        if (gItem.upgrade && gItem.grades) {
            let primlingFrom = 8
            let offeringFrom = 9
            if (gItem.grades[1] == 0) {
                // Rare at level 0
                primlingFrom = 4
                offeringFrom = 7
            } else if (gItem.grades[0] == 0) {
                // High at level 0
                primlingFrom = 6
                offeringFrom = 8
            }

            if (config.usePrimlingFromLevel === undefined) config.usePrimlingFromLevel = primlingFrom
            if (config.useOfferingFromLevel === undefined) config.useOfferingFromLevel = offeringFrom
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
                            console.warn(
                                `We can buy ${itemName} from ${npc} for ${npcPrice}, reducing from ${config.buyPrice} to ${npcPrice}`,
                            )
                            config.buyPrice = npcPrice
                            break
                        }
                    }
                }
            }

            if (config.sell) {
                // TODO: Add more comparisons, for example, between numbers and strings
                if (
                    (typeof config.buyPrice === "number" &&
                        typeof config.sellPrice === "number" &&
                        config.buyPrice >= config.sellPrice) ||
                    (config.buyPrice === "ponty" && config.sellPrice === "npc")
                ) {
                    console.warn(`We are selling ${itemName} for less than we're buying it for, removing 'sell: true'`)
                    delete config.sell
                }
            }
        }

        if (config.craft) {
            if (gCraft === undefined) {
                console.warn(`${itemName} is not craftable, removing 'craft'`)
                delete config.craft
            } else {
                for (const [, itemName2, itemLevel] of gCraft.items) {
                    const config2 = itemConfig[itemName2]
                    if (!config2) continue // No config for this requirement
                    if (config2.sell && config2.sellPrice === "npc") {
                        console.warn(`${itemName} requires ${itemName2} to craft, but we are selling ${itemName2}.`)
                    }
                    if (
                        (itemLevel === undefined && config2.destroyBelowLevel) ||
                        itemLevel < config2.destroyBelowLevel
                    ) {
                        console.warn(`${itemName} requires ${itemName2} to craft, but we are destroying ${itemName2}.`)
                    }
                }
            }
        }

        if (config.exchange) {
            if (gItem.e === undefined) {
                console.warn(`${itemName} is not exchangable, removing 'exchange'`)
                delete config.exchange
            } else if ((gItem.upgrade || gItem.compound) && config.exchangeAtLevel === undefined) {
                console.warn(
                    `${itemName} is compoundable / upgradable, but is missing exchangeAtLevevl, removing 'exchange'`,
                )
                delete config.exchange
            }
        }

        if (config.hold) {
            if (config.holdSlot !== undefined) {
                if (config.holdSlot > 41) {
                    console.warn(
                        `${itemName} cannot be put in to slot ${config.holdSlot}, removing 'slot: ${config.holdSlot}'`,
                    )
                    delete config.holdSlot
                } else {
                    if (holdSlots.has(config.holdSlot)) {
                        console.warn(
                            `${itemName} overlaps with ${holdSlots.get(config.holdSlot)} hold_slot, removing '${
                                config.holdSlot
                            }'`,
                        )
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
                    console.warn(
                        `${itemName} has a lower sell price than G, increasing from ${config.sellPrice} to ${gItem.g}`,
                    )
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
                if (config.sellExcess) {
                    console.warn(`${itemName} has both 'sell' and 'sellExcess' set, removing 'sell: true'`)
                    delete config.sell
                }
                if (config.list) {
                    console.warn(`${itemName} has 'list', but is selling at NPC price, removing 'list: true'`)
                    delete config.list
                }
            } else if (Array.isArray(config.sellPrice)) {
                for (const level in config.sellPrice) {
                    const sellPrice = config.sellPrice[level]
                    const itemInfo = new Item({ name: itemName, level: parseInt(level) }, AL.Game.G)
                    const npcValue = itemInfo.calculateNpcValue()
                    if (sellPrice < npcValue) {
                        console.warn(
                            `${itemName} @ level ${level} has a lower sell price than NPC, increasing from ${sellPrice} to ${npcValue}`,
                        )
                        config.sellPrice = npcValue
                    }
                }
                if (config.destroyBelowLevel) {
                    for (let level = 0; level < config.destroyBelowLevel; level++) {
                        if (config.sellPrice[level] === undefined) continue
                        console.warn(
                            `${itemName} has both 'sell' and 'destroyBelowLevel' set, removing 'config.sellPrice[${level}]'`,
                        )
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

        if (config.useOfferingFromLevel !== undefined && config.usePrimlingFromLevel !== undefined) {
            if (config.useOfferingFromLevel <= config.usePrimlingFromLevel) {
                console.warn(
                    `${itemName} has 'useOfferingFromLevel' <= and 'usePrimlingFromLevel'. Removing 'usePrimlingFromLevel'`,
                )
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

type LevelCounts = Map<
    number | undefined,
    {
        /** How many of this item @ this level do we have? */
        q: number
        /** How many spaces are the items taking up in inventory / bank space? */
        inventorySpaces: number
    }
>
type ItemCounts = Map<ItemName, LevelCounts>
type OwnerItemCounts = Map<string, ItemCounts>

export const OWNER_ITEM_COUNTS: OwnerItemCounts = new Map()
/**
 * This function will aggregate the bank, the inventories of all characters,
 * and the items equipped on all characters so we can see how many of each item
 * we own in total.
 * @param owner The owner to get items for (e.g.: `bot.owner`)
 */
export async function getItemCounts(owner: string): Promise<ItemCounts> {
    if (!AL.Database.connection) return new Map()

    let countMap = OWNER_ITEM_COUNTS.get(owner)
    if (countMap && !checkOnlyEveryMS(`item_everything_counts_${owner}`, 60_000)) {
        return countMap
    }

    const countData = await AL.BankModel.aggregate([
        {
            /** Find our bank **/
            $match: {
                owner: owner,
            },
        },
        {
            /** Find our characters **/
            $lookup: {
                from: "players",
                localField: "owner",
                foreignField: "owner",
                as: "players",
            },
        },
        {
            /** Add player equipment **/
            $addFields: {
                equipment: {
                    $filter: {
                        input: {
                            $concatArrays: [
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 0] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 1] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 2] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 3] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 4] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 5] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 6] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 7] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 8] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 9] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 10] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 11] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 12] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 13] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 14] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 15] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 16] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 17] }, {}] } },
                            ],
                        },
                        cond: {
                            $and: [{ $ne: ["$$this.v", null] }, { $ne: ["$$this.b", undefined] }],
                        },
                    },
                },
            },
        },
        {
            /** Merge equipment with bank and inventories **/
            $project: {
                allItems: {
                    $filter: {
                        input: {
                            $concatArrays: [
                                { $ifNull: ["$items0", []] },
                                { $ifNull: ["$items1", []] },
                                { $ifNull: ["$items2", []] },
                                { $ifNull: ["$items3", []] },
                                { $ifNull: ["$items4", []] },
                                { $ifNull: ["$items5", []] },
                                { $ifNull: ["$items6", []] },
                                { $ifNull: ["$items7", []] },
                                { $ifNull: ["$items8", []] },
                                { $ifNull: ["$items9", []] },
                                { $ifNull: ["$items10", []] },
                                { $ifNull: ["$items11", []] },
                                { $ifNull: ["$items12", []] },
                                { $ifNull: ["$items13", []] },
                                { $ifNull: ["$items14", []] },
                                { $ifNull: ["$items15", []] },
                                { $ifNull: ["$items16", []] },
                                { $ifNull: ["$items17", []] },
                                { $ifNull: ["$items18", []] },
                                { $ifNull: ["$items19", []] },
                                { $ifNull: ["$items20", []] },
                                { $ifNull: ["$items21", []] },
                                { $ifNull: ["$items22", []] },
                                { $ifNull: ["$items23", []] },
                                { $ifNull: ["$items24", []] },
                                { $ifNull: ["$items25", []] },
                                { $ifNull: ["$items26", []] },
                                { $ifNull: ["$items27", []] },
                                { $ifNull: ["$items28", []] },
                                { $ifNull: ["$items29", []] },
                                { $ifNull: ["$items30", []] },
                                { $ifNull: ["$items31", []] },
                                { $ifNull: ["$items32", []] },
                                { $ifNull: ["$items33", []] },
                                { $ifNull: ["$items34", []] },
                                { $ifNull: ["$items35", []] },
                                { $ifNull: ["$items36", []] },
                                { $ifNull: ["$items37", []] },
                                { $ifNull: ["$items38", []] },
                                { $ifNull: ["$items39", []] },
                                { $ifNull: ["$items40", []] },
                                { $ifNull: ["$items41", []] },
                                { $ifNull: ["$items42", []] },
                                { $ifNull: ["$items43", []] },
                                { $ifNull: ["$items44", []] },
                                { $ifNull: ["$items45", []] },
                                { $ifNull: ["$items46", []] },
                                { $ifNull: ["$items47", []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 0] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 1] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 2] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 3] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 4] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 5] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 6] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 7] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 8] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 9] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 10] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 11] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 12] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 13] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 14] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 15] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 16] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 17] }, []] },
                                { $ifNull: ["$equipment.v", []] },
                            ],
                        },
                        as: "item",
                        cond: { $ne: ["$$item", null] },
                    },
                },
            },
        },
        {
            $unwind: {
                path: "$allItems",
            },
        },
        {
            /** Group by name and level **/
            $group: {
                _id: { name: "$allItems.name", level: "$allItems.level" },
                inventorySpaces: { $count: {} },
                q: { $sum: "$allItems.q" },
            },
        },
        {
            /** Clean up **/
            $project: {
                _id: false,
                name: "$_id.name",
                level: "$_id.level",
                inventorySpaces: "$inventorySpaces",
                q: { $max: ["$q", "$inventorySpaces"] },
            },
        },
        {
            $sort: {
                name: 1,
                level: -1,
                q: -1,
            },
        },
    ])

    // Clear the old data
    if (!countMap) countMap = new Map()
    else countMap.clear()

    // Set the data
    for (const countDatum of countData) {
        const levelCounts: LevelCounts = countMap.get(countDatum.name) ?? new Map()
        levelCounts.set(countDatum.level, { q: countDatum.q, inventorySpaces: countDatum.inventorySpaces })
        countMap.set(countDatum.name, levelCounts)
    }

    OWNER_ITEM_COUNTS.set(owner, countMap)
    return countMap
}

/**
 * Reduces the count of the item. Useful to call before doing things that will/may
 * alter our item counts
 *
 * @param owner
 * @param item
 * @returns
 */
export function reduceCount(owner: string, item: ItemData) {
    let countMap = OWNER_ITEM_COUNTS.get(owner)
    if (!countMap) return // We don't have any owner data
    let itemMap = countMap.get(item.name)
    if (!itemMap) return // We don't have any item data
    let countData = itemMap.get(item.level)
    if (!countData) return // We don't have any count data
    countData.inventorySpaces -= 1
    countData.q -= item.q ?? 1
}
