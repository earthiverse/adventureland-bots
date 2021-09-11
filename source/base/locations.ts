import AL from "alclient"

// Main
export const mainBeesNearTunnel: AL.IPosition = { map: "main", x: 152, y: 1487 }
export const mainBeesNearGoos: AL.IPosition = { map: "main", x: 546, y: 1059 }
export const mainBeesNearRats: AL.IPosition = { map: "main", x: 625, y: 725 }
export const mainCrabs: AL.IPosition = { map: "main", x: -1202.5, y: -66 }
export const mainFishingSpot: AL.IPosition = { map: "main", x: -1198, y: -288 }
export const mainGoos: AL.IPosition = { map: "main", x: -64, y: 787 }
export const mainPoisios: AL.IPosition = { map: "main", x: -121, y: 1360 }
export const mainScorpions: AL.IPosition = { map: "main", x: 1577.5, y: -168 }
export const mainSpiders: AL.IPosition = { map: "main", x: 948, y: -144 }

// Bat Cave
export const batCaveCryptEntrance: AL.IPosition = { map: "cave", x: -193.41, y: -1295.83 }

// Crypt
export const cryptWaitingSpot: AL.IPosition = { map: "crypt", x: 100, y: 50 }

// Halloween
export const halloweenSafeSnakes: AL.IPosition = { map: "halloween", x: 346.5, y: -747 }

// Winterland
export const winterlandArcticBees: AL.IPosition = { map: "winterland", x: 1082, y: -873 }

export function offsetPosition(position: AL.IPosition, x: number, y: number): AL.IPosition {
    return { in: position.in, map: position.map, x: position.x + x, y: position.y + y }
}