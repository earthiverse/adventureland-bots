import type {
    CharacterType,
    Mage,
    Merchant,
    Paladin,
    PingCompensatedCharacter,
    Priest,
    Ranger,
    Rogue,
    ServerIdentifier,
    ServerRegion,
    Warrior,
} from "alclient"

export type SupportedCharacter =
    | Mage
    | Merchant
    | Paladin
    | Priest
    | Ranger
    | Rogue
    | Warrior
    | PingCompensatedCharacter

export interface BotCredentials {
    owner: string
    userAuth: string
    characterId: string
    characterType: CharacterType
    targetServer: {
        region: ServerRegion
        identifier: ServerIdentifier
    }
}
