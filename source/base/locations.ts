import { Character, IPosition, Pathfinder } from "alclient"
import { NodeData } from "alclient/build/definitions/pathfinder"

// Main
export const mainArmadillos: NodeData = { map: "main", x: 526, y: 1846 }
export const mainBeesNearTunnel: NodeData = { map: "main", x: 152, y: 1487 }
export const mainBeesNearGoos: NodeData = { map: "main", x: 546, y: 1059 }
export const mainBeesNearRats: NodeData = { map: "main", x: 625, y: 725 }
export const mainBigBirds: NodeData = { map: "main", x: 1343, y: 248 }
export const mainCrabs: NodeData = { map: "main", x: -1202.5, y: -66 }
export const mainCrabXs: NodeData = { map: "main", x: -984, y: 1762 }
export const mainCrocs: NodeData = { map: "main", x: 801, y: 1710 }
export const mainFishingSpot: NodeData = { map: "main", x: -1198, y: -288 }
export const mainFrogs: NodeData = { map: "main", x: -1124.5, y: 1118 }
export const mainGoos: NodeData = { map: "main", x: -64, y: 787 }
export const mainPoisios: NodeData = { map: "main", x: -121, y: 1360 }
export const mainScorpions: NodeData = { map: "main", x: 1577.5, y: -168 }
export const mainSnakes: NodeData = { map: "main", x: -82, y: 1901 }
export const mainSpiders: NodeData = { map: "main", x: 948, y: -144 }
export const mainSquigs: NodeData = { map: "main", x: -1175.5, y: 422 }
export const mainSquigtoads = mainSquigs
export const mainTortoises = mainFrogs

// Bank
export const bankingPosition: NodeData = { map: "bank", x: 0, y: -200 }

// (Bat) Cave
export const caveCryptEntrance: NodeData = { map: "cave", x: -193.41, y: -1295.83 }
export const caveBatsNearDoor: NodeData = { map: "cave", x: -194, y: -461 }
export const caveBatsNearCrypt: NodeData = { map: "cave", x: 323.5, y: -1107 }
export const caveBatsSouthEast: NodeData = { map: "cave", x: 1243, y: -27 }
export const caveBatsNorthEast: NodeData = { map: "cave", x: 1201.5, y: -782 }

// Crypt
export const cryptWaitingSpot: NodeData = { map: "crypt", x: 100, y: 50 }
export const cryptEnd: NodeData = { map: "crypt", x: 2689.64, y: 505.06 }

// Desertland
export const desertlandPorcupines: NodeData = { map: "desertland", x: -829, y: 135 }
export const desertlandScorpions: NodeData = { map: "desertland", x: 390.675, y: -1422.46 }

// Halloween
export const halloweenGreenJr: NodeData = { map: "halloween", x: -569, y: -511.5 }
export const halloweenSafeSnakes: NodeData = { map: "halloween", x: 346.5, y: -747 }
export const halloweenMiniMushes: NodeData = { map: "halloween", x: 16, y: 630.5 }
export const halloweenXScorpions: NodeData = { map: "halloween", x: -485.5, y: 685.5 }

// Level1
export const level1PratsNearDoor: NodeData = { map: "level1", x: -11, y: 114.5 }
export const level1PratsNearLedge: NodeData = { map: "level1", x: -154, y: 695.5 }

// Level2W
export const frankyIdlePosition: NodeData = { map: "level2w", x: 0, y: 0 }

// Tunnel
export const miningSpot: NodeData = { map: "tunnel", x: -280, y: -10 }

// Winterland
export const winterlandArcticBees: NodeData = { map: "winterland", x: 1082, y: -873 }
export const winterlandBoars: NodeData = { map: "winterland", x: 19.5, y: -1109 }
export const winterlandXmageEntrance: NodeData = { map: "winterland", x: 1060, y: -2000 }

// Winter Cave
export const winterCaveBBPomPomsNearDoor: NodeData = { map: "winter_cave", x: 51, y: -164 }
export const winterCaveBBPomPomsAbove: NodeData = { map: "winter_cave", x: -82.5, y: -949 }

export function getClosestBotToPosition(position: NodeData, bots: Character[]): Character {
    let closest: Character
    let closestScore = Number.MAX_VALUE
    for (const bot of bots) {
        const path = Pathfinder.getPath(bot, position)
        const score = Pathfinder.computePathCost(path)
        if (score < closestScore) {
            closest = bot
            closestScore = score
        }
    }
    return closest
}

export function offsetPosition(position: IPosition, x: number, y: number): IPosition {
    return { in: position.in, map: position.map, x: position.x + x, y: position.y + y }
}

export function offsetPositionParty(position: IPosition, bot: Character, offsetAmount = 20): IPosition {
    let offsetIndex: number
    if (bot.party && bot.partyData?.list) {
        // Use the party list for the offset
        offsetIndex = bot.partyData.list.indexOf(bot.id)
    } else {
        // Use player names for the offset
        offsetIndex = ([...bot.players.keys(), bot.id].sort()).indexOf(bot.id)
    }

    if (offsetIndex === 0) return position // We're the leader, we stand in the middle
    offsetIndex -= 1

    // Spiral from the position to get the offset.
    // Based on https://stackoverflow.com/a/19287714
    let i = 0
    let pos: IPosition = { in: position.in, map: position.map, x: position.x, y: position.y }
    while (i <= offsetIndex) {
        const r = Math.floor((Math.sqrt(i + 1) - 1) / 2) + 1
        const p = (8 * r * (r - 1)) / 2
        const en = r * 2
        const a = (1 + i - p) % (r * 8)

        pos.x = position.x
        pos.y = position.y

        switch (Math.floor(a / (r * 2))) {
            case 0:
                {
                    pos.x += offsetAmount * (a - r)
                    pos.y += offsetAmount * (-r)
                }
                break
            case 1:
                {
                    pos.x += offsetAmount * (r)
                    pos.y += offsetAmount * ((a % en) - r)

                }
                break
            case 2:
                {
                    pos.x += offsetAmount * (r - (a % en))
                    pos.y += offsetAmount * (r)
                }
                break
            case 3:
                {
                    pos.x += offsetAmount * (-r)
                    pos.y += offsetAmount * (r - (a % en))
                }
                break
        }
        if (!Pathfinder.canStand(pos)) offsetIndex++ // This position is not standable, we need another position
        i++
    }

    return pos
}