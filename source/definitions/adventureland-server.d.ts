import { MapName, ServerIdentifier, ServerRegion, MonsterName, NPCRole, NPCType, CharacterType, StatusInfo, SlotInfo } from "./adventureland"

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

    success: 1
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
    response: "gold_received"
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
    source: "attack" | "heal"
} | {
    anim: "miss"
    damage: 0
    miss: true
}