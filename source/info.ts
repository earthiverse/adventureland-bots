import { PartyInfo, PlayersInfo, NPCInfo, MonstersInfo } from "./definitions/bots"

// This function helps parse Date objects
function reviver(key: string, value: unknown): unknown {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
        return new Date(value)
    }
    return value
}

function serverPrefix(): string {
    return `${parent.server_region}.${parent.server_identifier}`
}

// Monster Information
export function getMonstersInfo(): MonstersInfo {
    return JSON.parse(localStorage.getItem(`${serverPrefix()}_monsters`), reviver) || {}
}
export function setMonstersInfo(info: MonstersInfo): void {
    localStorage.setItem(`${serverPrefix()}_monsters`, JSON.stringify(info))
}

// NPC Information
export function getNPCInfo(): NPCInfo {
    return JSON.parse(localStorage.getItem(`${serverPrefix()}_npcs`), reviver) || {}
}
export function setNPCInfo(info: NPCInfo): void {
    localStorage.setItem(`${serverPrefix()}_npcs`, JSON.stringify(info))
}

// Party Information
export function getPartyInfo(): PartyInfo {
    return JSON.parse(localStorage.getItem(`${serverPrefix()}_party`), reviver) || {}
}
export function setPartyInfo(info: PartyInfo): void {
    localStorage.setItem(`${serverPrefix()}_party`, JSON.stringify(info))
}

// Player Information
export function getPlayersInfo(): PlayersInfo {
    return JSON.parse(localStorage.getItem(`${serverPrefix()}_players`), reviver) || {}
}
export function setPlayersInfo(info: PlayersInfo): void {
    localStorage.setItem(`${serverPrefix()}_players`, JSON.stringify(info))
}