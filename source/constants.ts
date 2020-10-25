import { ItemName, MonsterName } from "./definitions/adventureland"
import { ItemLevelInfo } from "./definitions/bot"

export const NPC_INTERACTION_DISTANCE = 400
export const DOOR_REACH_DISTANCE = 40
export const TRANSPORTER_REACH_DISTANCE = 75

export const BASE = {
    h: 8,
    v: 7,
    vn: 2
}

export const ITEMS_TO_EXCHANGE: ItemName[] = [
    // General exchangables
    "5bucks", "gem0", "gem1",
    // Seashells for potions
    "seashell",
    // Leather for capes
    "leather",
    // Christmas
    "candycane", "mistletoe", "ornament",
    // Halloween
    "candy0", "candy1",
    // Chinese New Year's
    "redenvelopev3",
    // Easter
    "basketofeggs",
    // Boxes
    "armorbox", "bugbountybox", "gift0", "gift1", "mysterybox", "weaponbox", "xbox"
]
export const ITEMS_TO_BUY: ItemName[] = [
    // Exchangeables
    ...ITEMS_TO_EXCHANGE,
    // Belts
    "dexbelt", "intbelt", "strbelt",
    // Rings
    "ctristone", "dexring", "intring", "ringofluck", "strring", "suckerpunch", "tristone",
    // Earrings
    "dexearring", "intearring", "lostearring", "strearring",
    // Amulets
    "amuletofm", "dexamulet", "intamulet", "snring", "stramulet", "t2dexamulet", "t2intamulet", "t2stramulet",
    // Orbs
    "charmer", "ftrinket", "jacko", "orbg", "orbofdex", "orbofint", "orbofsc", "orbofstr", "rabbitsfoot", "talkingskull",
    // Shields
    "t2quiver", "lantern", "mshield", /*"quiver",*/ "sshield", "xshield",
    // Capes
    "angelwings", "bcape", "cape", "ecape", "stealthcape",
    // Shoes
    "eslippers", "hboots", "mrnboots", "mwboots", "shoes1", "wingedboots", /*"wshoes",*/ "xboots",
    // Pants
    "hpants", "mrnpants", "mwpants", "pants1", "starkillers", /*"wbreeches",*/ "xpants",
    // Armor
    "cdragon", "coat1", "harmor", "mcape", "mrnarmor", "mwarmor", "tshirt0", "tshirt1", "tshirt2", "tshirt3", "tshirt4", "tshirt6", "tshirt7", "tshirt8", "tshirt88", "tshirt9", "warpvest", /*"wattire",*/ "xarmor",
    // Helmets
    "eears", "fury", "helmet1", "hhelmet", "mrnhat", "mwhelmet", "partyhat", "rednose", /*"wcap",*/ "xhelmet",
    // Gloves
    "gloves1", "goldenpowerglove", "handofmidas", "hgloves", "mrngloves", "mwgloves", "poker", "powerglove", /*"wgloves",*/ "xgloves",
    // Good weapons
    "basher", "bataxe", "bowofthedead", "candycanesword", "carrotsword", "crossbow", "dartgun", "firebow", "frostbow", "froststaff", "gbow", "harbringer", "heartwood", "hbow", "merry", "oozingterror", "ornamentstaff", "pmace", "t2bow", "t3bow", "wblade",
    // Things we can exchange / craft with
    "ascale", "bfur", "cscale", "electronics", "feather0", "fireblade", "goldenegg", "goldingot", "goldnugget", "leather", /*"networkcard",*/ "platinumingot", "platinumnugget", "pleather", "snakefang",
    // Things to make xbox
    "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8",
    // Things to make easter basket
    "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8",
    // Essences
    "essenceofether", "essenceoffire", "essenceoffrost", "essenceoflife", "essenceofnature",
    // Potions & consumables
    "bunnyelixir", "candypop", "elixirdex0", "elixirdex1", "elixirdex2", "elixirint0", "elixirint1", "elixirint2", "elixirluck", "elixirstr0", "elixirstr1", "elixirstr2", "greenbomb", "hotchocolate",
    // High level scrolls
    "cscroll3", "scroll3", "scroll4", "forscroll", "luckscroll", "manastealscroll",
    // Misc. Things
    "bottleofxp", "bugbountybox", "computer", "cxjar", "monstertoken", "poison", "snakeoil"
]

export const ITEMS_TO_SELL: ItemLevelInfo = {
    // Default clothing
    "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2,
    // Halloween
    "gphelmet": 2, "phelmet": 2
}

export const MERCHANT_ITEMS_TO_HOLD: ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1",
    // Jacko
    "jacko",
    // MH Tokens
    "monstertoken",
    // Scrolls
    "cscroll0", "cscroll1", "cscroll2", "cscroll3", "scroll0", "scroll1", "scroll2", "scroll3", "scroll4", "strscroll", "intscroll", "dexscroll"
]

export const PRIEST_ITEMS_TO_HOLD: ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1",
    // Jacko
    "jacko",
    // Weapons
    "firestaff", "pmace",
    // Shields
    "lantern", "shield", "sshield",
    // Orbs
    "orbg", "orbofint", "wbook1"
]

export const RANGER_ITEMS_TO_HOLD: ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1",
    // Jacko
    "jacko",
    // Weapons
    "bow", "bowofthedead", "crossbow", "firebow", "hbow", "merry", "orbg",
    // Quivers
    "quiver", "t2quiver",
    // Orbs
    "orbg", "orbofdex"
]

export const WARRIOR_ITEMS_TO_HOLD: ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1",
    // Jacko
    "jacko",
    // Weapons
    "basher", "bataxe", "candycanesword", "carrotsword", "fireblade", "heartwood", "swordofthedead", "woodensword",
    // Shields
    "lantern", "shield", "sshield",
    // Orbs
    "orbg", "orbofstr"
]

export const SPECIAL_MONSTERS: MonsterName[] = ["dragold", "fvampire", "franky", "goldenbat", "greenjr", "grinch", "jr", "mrgreen", "mrpumpkin", "mvampire", "phoenix", "pinkgoo", "snowman", "tinyp", "wabbit"]

export const USE_BJARNY_MAGIPORT = true