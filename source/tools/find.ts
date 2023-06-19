import { IPlayerDocument, CharacterType } from "alclient";
import { AxiosResponse } from "axios";

export function getOwner(data: AxiosResponse): string {
    // Get owner ID
    for (const cookie of data.headers["set-cookie"] || []) {
        const result = /^referrer=(\d+?);/.exec(cookie)
        if (result) {
            // We found the owner
            return result[1]
        }
    }
}

const PLAYER_INFO_REGEX = /<script>\s+var slots.+?=(.+?);\s*<\/script>.+?Name:<\/span>\s*(.+?)<\/div>.+?Class:<\/span>\s*(.+?)<\/div>.+?Level:<\/span>\s*(\d+?)<\/div>.+?<\/span>\s*<\/div>/gms

export function getPlayerInfo(data: AxiosResponse) {
    const playerInfo: Partial<IPlayerDocument>[] = [];

    let match: RegExpExecArray
    while ((match = PLAYER_INFO_REGEX.exec(data.data)) !== null) {
        if (match.index === PLAYER_INFO_REGEX.lastIndex) PLAYER_INFO_REGEX.lastIndex++

        const slots = JSON.parse(match[1])
        const name = match[2]
        const type = match[3].toLowerCase() as CharacterType
        const level = Number.parseInt(match[4])

        playerInfo.push({
            name: name,
            type: type
        })
    }

    return playerInfo
}