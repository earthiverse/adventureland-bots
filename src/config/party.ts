import type { CharacterType, MonsterName, ServerIdentifier, ServerRegion } from "alclient"

export interface CharacterConfig {
    name: string
    type: CharacterType
}

export interface TeamConfig {
    server: {
        region: ServerRegion
        identifier: ServerIdentifier
    }
    merchant?: CharacterConfig
    partyLeader: string
    characters: CharacterConfig[]
    defaultFarmTargets: MonsterName[]
    enableServerHops: boolean
    enableEvents: boolean
}

export const activeTeamConfig: TeamConfig = {
    server: {
        region: "US",
        identifier: "I",
    },
    merchant: {
        name: "Merzair",
        type: "merchant",
    },
    partyLeader: "Warzair",
    characters: [
        { name: "Warzair", type: "warrior" },
        { name: "Magzair", type: "mage" },
        { name: "Prizair", type: "priest" },
    ],
    defaultFarmTargets: ["goo", "bee", "crab"],
    enableServerHops: true,
    enableEvents: true,
}
