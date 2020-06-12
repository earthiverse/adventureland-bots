import { NPCType, CharacterType, StatusInfo, SlotInfo, ItemInfo } from "./adventureland"

export type WelcomeData = {
    region: ServerRegion
    map: MapName
    // TODO: Find out what this is
    info: any
    name: ServerIdentifier
    pvp: boolean
    x: number
    y: number
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

export type EntitiesData = {
    type: "all" | "xy"
    in: MapName
    map: MapName

    monsters: EntityData[]
    players: PlayerData[]
}

export type EntityData = {
    id: string
    type: MonsterType

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
    going_x: number
    going_y: number
    hp: number
    level: number
    max_hp: number
    max_mp: number
    move_num: number
    moving: boolean
    mp: number
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

export type ServerData = {
    addr: string
    port: number
    region: ServerRegion
    name: ServerIdentifier
    players: number
    key: string
}

export type GameResponseData = {
    response: "gold_received" | string
    gold: number
    name: string
}

export type HitData = {
    anim: Exclude<string, "miss">
    damage: number
    hid: string
    id: string
    pid: string
    projectile: string
    source: "attack" | "heal" | string
} | {
    anim: "miss"
    damage: 0
    miss: true
}

export type StartData = {
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
    // TODO: Figure this out
    info: any
    base_gold: {
        [T in MonsterType]?: { [T in string]?: number }
    }
    // TODO: Figure this type out
    s_info: any
    entities: EntitiesData
}

export type MapName = string
export type MonsterType = string
export type ServerIdentifier = string
export type ServerRegion = string