import { Character, IPosition } from "alclient"

// Main
export const mainArmadillos: IPosition = { map: "main", x: 526, y: 1846 }
export const mainBeesNearTunnel: IPosition = { map: "main", x: 152, y: 1487 }
export const mainBeesNearGoos: IPosition = { map: "main", x: 546, y: 1059 }
export const mainBeesNearRats: IPosition = { map: "main", x: 625, y: 725 }
export const mainBigBirds: IPosition = { map: "main", x: 1343, y: 248 }
export const mainCrabs: IPosition = { map: "main", x: -1202.5, y: -66 }
export const mainCrabXs: IPosition = { map: "main", x: -984, y: 1762 }
export const mainCrocs: IPosition = { map: "main", x: 801, y: 1710 }
export const mainFishingSpot: IPosition = { map: "main", x: -1198, y: -288 }
export const mainFrogs: IPosition = { map: "main", x: -1124.5, y: 1118 }
export const mainGoos: IPosition = { map: "main", x: -64, y: 787 }
export const mainPoisios: IPosition = { map: "main", x: -121, y: 1360 }
export const mainScorpions: IPosition = { map: "main", x: 1577.5, y: -168 }
export const mainSnakes: IPosition = { map: "main", x: -82, y: 1901 }
export const mainSpiders: IPosition = { map: "main", x: 948, y: -144 }
export const mainSquigs: IPosition = { map: "main", x: -1175.5, y: 422 }
export const mainSquigtoads = mainSquigs
export const mainTortoises = mainFrogs

// Bank
export const bankingPosition: IPosition = { map: "bank", x: 0, y: -200 }

// Bat Cave
export const batCaveCryptEntrance: IPosition = { map: "cave", x: -193.41, y: -1295.83 }

// Crypt
export const cryptWaitingSpot: IPosition = { map: "crypt", x: 100, y: 50 }
export const cryptEnd: IPosition = { map: "crypt", x: 2689.64, y: 505.06 }

// Desertland
export const desertlandPorcupines: IPosition = { map: "desertland", x: -829, y: 135 }
export const desertlandScorpions: IPosition = { map: "desertland", x: 390.675, y: -1422.46 }

// Halloween
export const halloweenSafeSnakes: IPosition = { map: "halloween", x: 346.5, y: -747 }
export const halloweenMiniMushes: IPosition = { map: "halloween", x: 16, y: 630.5 }
export const halloweenXScorpions: IPosition = { map: "halloween", x: -485.5, y: 685.5 }

// Level1
export const level1PratsNearDoor: IPosition = { map: "level1", x: -11, y: 114.5 }
export const level1PratsNearLedge: IPosition = { map: "level1", x: -154, y: 695.5 }

// Tunnel
export const miningSpot: IPosition = { map: "tunnel", x: -280, y: -10 }

// Winterland
export const winterlandArcticBees: IPosition = { map: "winterland", x: 1082, y: -873 }
export const winterlandBoars: IPosition = { map: "winterland", x: 19.5, y: -1109 }

export function offsetPosition(position: IPosition, x: number, y: number): IPosition {
    return { in: position.in, map: position.map, x: position.x + x, y: position.y + y }
}

export function offsetPositionParty(position: IPosition, bot: Character, offsetAmount = 10): IPosition {
    const offset = { x: 0, y: 0 }
    if (bot.party) {
        switch (bot.partyData?.list?.indexOf(bot.id)) {
            case 1:
                offset.x = offsetAmount
                break
            case 2:
                offset.x = -offsetAmount
                break
            case 3:
                offset.y = offsetAmount
                break
            case 4:
                offset.y = -offsetAmount
                break
            case 5:
                offset.x = offsetAmount
                offset.y = offsetAmount
                break
            case 6:
                offset.x = offsetAmount
                offset.y = -offsetAmount
                break
            case 7:
                offset.x = -offsetAmount
                offset.y = offsetAmount
                break
            case 8:
                offset.x = -offsetAmount
                offset.y = -offsetAmount
                break
            case 9:
                offset.x = 2 * offsetAmount
                break
        }
    }
    return { in: position.in, map: position.map, x: position.x + offset.x, y: position.y + offset.y }
}