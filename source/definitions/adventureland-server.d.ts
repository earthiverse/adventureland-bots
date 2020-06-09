import { MapName, ServerIdentifier, ServerRegion } from "./adventureland"

export type WelcomeData = {
    region: ServerRegion
    map: MapName
    /** TODO: Find out what this is */
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
    /** TODO: Find out what this is */
    scale: number
    
    /** 1 indicates success */
    success: number
}

export type AuthData = {
    /** TODO: Find out where to get this auth string */
    auth: string
    /** NOTE: This is not the name of the player. It's a long number, encoded as a string. */
    user: string
    /** NOTE: This is not the name of the character. It's a long number, encoded as a string. */
    character: string
    passphrase: string

    height: number
    width: number
    scale: number
    no_html: string
    no_graphics: string

    code_slot: number
}