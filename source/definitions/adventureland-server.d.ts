import { NPCType, CharacterType, StatusInfo, SlotInfo, ItemInfo, MapName, MonsterName, ItemName, ServerRegion, ServerIdentifier, BankPackType, BankInfo } from "./adventureland"

export type ActionData = {
    attacker: string
    damage: number
    eta: number
    m: number
    pid: string
    projectile: "arrow" | "pmag" | "supershot" | string
    source: "attack" | "supershot" | string
    target: string
    type: "attack" | "supershot" | string
    x: number
    y: number
}

export type AuthData = {
    // TODO: Find out where to get this auth string
    auth: string
    /** NOTE: This is not the name of the player. It's a long number, encoded as a string. */
    user: string
    /** NOTE: This is not the name of the character. It's a long number, encoded as a string. */
    character: string
    passphrase: string

    height: number
    width: number
    scale: number

    no_html: "1" | ""
    no_graphics: "True" | ""

    code_slot?: number
}

export type CharacterData = {
    hp: number
    max_hp: number
    mp: number
    max_mp: number
    attack: number
    frequency: number
    speed: number
    range: number
    armor: number
    resistance: number
    level: number
    rip: boolean
    afk: "afk" | string
    s: StatusInfo
    // TODO: Figure this type out
    c: any
    // TODO: Figure this type out
    q: any
    age: number
    pdps: number
    id: string
    x: number
    y: number
    going_x?: number
    going_y?: number
    moving: boolean
    cid: number
    stand: boolean,
    controller: string
    skin: string
    cx: any
    slots: SlotInfo
    ctype: CharacterType
    owner: string
    int: number
    str: number
    dex: number
    vit: number
    for: number
    mp_cost: number
    max_xp: number
    goldm: number
    xpm: number
    luckm: number
    map: MapName
    in: string
    isize: number
    esize: number
    gold: number
    cash: number
    targets: number
    m: number
    evasion: number
    miss: number
    reflection: number
    lifesteal: number
    manasteal: number
    rpiercing: number
    apiercing: number
    crit: number
    critdamage: number
    dreturn: number
    tax: number
    xrange: number
    items: ItemInfo[]
    cc: number
    ipass: string
    // TODO: Figure this out
    friends: any
    // TODO: Figure this out
    acx: any
    xcx: string[]
    /** Extra events (e.g. ["game_response", {response: "upgrade_success", level: 4, num: 8}]) */
    hitchhikers?: [string, any][]
    /** Holds bank information when the character is inside the bank */
    user?: BankInfo
}

export type ChestData = {
    chest: "chest3" | "chest4" | "chest6" | string
    id: string
    items: number
    map: MapName
    party: string
    x: number
    y: number
}

export type ChestOpenedData = {
    id: string
    gold: number
    goldm: number
    items: {
        name: string
        q?: number
        level?: number
        looter: string
    }[]
    opener: string
    party: boolean
} | {
    id: string
    gone: true
}

export type DeathData = {
    id: string
    place?: "attack" | string
}

export type DisappearData = {
    id: string
    reason: "transport" | string
    s: number
    to: MapName
}

export type DisappearingTextData = {
    message: string
    x: number
    y: number
    id: string
    args: any
}

export type EntitiesData = {
    type: "all" | "xy"
    in: MapName
    map: MapName

    monsters: EntityData[]
    players: PlayerData[]
}

export type EntityData = {
    id: string
    type: MonsterName

    abs: boolean
    angle: number
    armor: number
    attack: number
    cid: number
    frequency: number
    going_x: number
    going_y: number
    hp: number
    level: number
    max_hp: number
    move_num: number
    moving: boolean
    resistance: number
    // TODO: Figure out what this is
    s: any
    speed: number
    /** The ID of the target */
    target?: string
    xp: number

    x: number
    y: number
}

export type EvalData = {
    code: string
}

export type GameResponseData = GameResponseDataObject | GameResponseDataString

// TODO: split these in to other objects
export type GameResponseDataObject = GameResponseAttackFailed | GameResponseBankRestrictions | GameResponseBuySuccess | GameResponseItemSent | {
    response: "bank_restrictions" | "gold_received" | "item_placeholder" | "item_received" | string
    gold: number
    name: string
}

export type GameResponseDataString =
    | "buy_cant_npc"
    | "buy_cant_space"
    | "buy_cost"
    /** Too far away from monster hunt npc */
    | "ecu_get_closer"
    /** When a merchant tries to start a monster hunt */
    | "monsterhunt_merchant"
    | "monsterhunt_started"
    | "skill_too_far"
    | "trade_get_closer"
    | "upgrade_in_progress"
    | string

export type GameResponseAttackFailed = {
    response: "attack_failed",
    place: "attack" | string
    id: string
}

export type GameResponseBankRestrictions = {
    response: "bank_restrictions"
    place: "compound" | string
}

export type GameResponseBuySuccess = {
    response: "buy_succcess"
    cost: number
    // Inventory slot that the item is now in
    num: number
    name: ItemName
    q: number
}

export type GameResponseItemSent = {
    response: "item_sent"
    // User ID the item was sent to
    name: string
    item: ItemName
    q: number
}

export type HitData = {
    anim: "arrow_hit" | "miss" | "reflect" | "slash1" | string
    damage: number
    lifesteal?: number
    evade?: boolean
    hid?: string
    id?: string
    pid?: string
    projectile?: string
    reflect?: boolean
    source?: "attack" | "heal" | string
    miss?: boolean
    kill?: boolean
}

export type LoadedData = {
    /** The height of the monitor's resolution */
    height: number
    /** The width of the monitor's resolution */
    width: number
    // TODO: Find out what this is
    scale: number
    success: 1 | number
}

export type NewMapData = {
    direction: number
    effect: number
    entities: EntitiesData
    in: MapName
    info: any
    m: number
    map: MapName
    x: number
    y: number
}

export type PartyData = {
    list: string[]
    message?: string
    party: {
        [T in string]: {
            gold: number
            in: MapName
            // TODO: What is this?
            l: number
            level: number
            luck: number
            map: MapName
            share: number
            skin: string
            type: string
            x: number
            xp: number
            y: number
        }
    }
}

export type PlayerData = {
    id: string
    ctype: CharacterType | NPCType

    abs: boolean
    angle: number
    armor: number
    // TODO: Figure out what this is
    c: any
    cid: number
    // TODO: Figure out what this is
    cx: any
    focus?: string
    frequency: number
    x: number
    y: number
    going_x: number
    going_y: number
    hp: number
    level: number
    max_hp: number
    max_mp: number
    move_num: number
    moving: boolean
    mp: number
    npc?: string
    owner: string
    // TODO: Figure out what this is
    pdps: number
    // TODO: Figure out what this is
    q: any
    range: number
    resistance: number
    rip: boolean
    s: StatusInfo
    skin: string
    slots: SlotInfo
}

export type QData = {
    num: number
    p: {
        chance: number
        level: number
        name: ItemName
        nums: number[]
        scroll: ItemName
        success?: boolean
    }
    q: {
        compound?: {
            len: number
            ms: number
            num: number
            // NOTE: I don't think this value is used?
            nums: number[]
        }
        upgrade?: {
            len: number
            ms: number
            num: number
        }
    }
}

export type ServerData = {
    addr: string
    port: number
    region: ServerRegion
    name: ServerIdentifier
    players: number
    key: string
}

export type StartData = CharacterData & {
    // TODO: Figure this out
    info: any
    base_gold: {
        [T in MonsterName]?: { [T in string]?: number }
    }
    // TODO: Figure this type out
    s_info: any
    entities: EntitiesData
}

export type UpgradeData = {
    type: "compound" | "exchange" | "upgrade" | string
    /** 0 = fail, 1 = success */
    success: 0 | 1
}

export type WelcomeData = {
    region: ServerRegion
    in: MapName
    map: MapName
    // TODO: Find out if this is "hardcore" on a hardcore server
    gameplay: "normal" | string
    // TODO: Find out what this is
    info: any
    name: ServerIdentifier
    pvp: boolean
    x: number
    y: number
}