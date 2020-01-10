import { MapName, ItemInfo, MonsterType, NPCType, IPosition, IPositionReal, IEntity, NPCName, ICharacter, StatusInfo, BankPackType, ItemName, CharacterType } from "./adventureland";

export type TargetPriorityList = {
    [T in MonsterType]?: TargetPriorityInfo;
};

export interface TargetPriorityInfo {
    /** The higher the priority, the more likely we are to target it. */
    priority: number
    /** If true, we will only attack the target as a team */
    coop?: CharacterType[]
    /** When smart moving past the monster, if true, we won't attack the monster. */
    holdAttackWhileMoving?: boolean
    /** If set to true, we will not attack the entity if we are within their attacking range */
    holdAttackInEntityRange?: boolean
    /** If true, we won't move to attack the monsters. Use this with map, x, and y to go to a safe (unreachable) spot. */
    holdPositionFarm?: boolean
    /** When smart moving to this monster, if true, we will stop when we see one within attacking range. */
    stopOnSight?: boolean

    farmingPosition?: IPositionReal
}

export type MonsterSpawnPosition = IPositionReal & {
    monster: MonsterType
}

export type EmptyBankSlots = {
    pack: Exclude<BankPackType, "gold">
    index: number
}

export type OtherInfo = {
    party: {
        [T in string]?: IPositionReal & {
            lastSeen: Date
            shouldSwitchServer: boolean
            monsterHuntTarget: MonsterType
            items: MyItemInfo[]
            goldm: number
            last_ms: Date
            luckm: number
            attack: number
            frequency: number
            s: StatusInfo
        }
    }
    npcs: {
        [T in NPCName]?: IPositionReal & {
            lastSeen: Date
        }
    }
    players: {
        [T in string]?: IEntity
    }
}

export type ItemLevelInfo = {
    /** Items this level and under will be sold */
    [T in ItemName]?: number
}

export type MyItemInfo = ItemInfo & {
    /** Specifies the index of the item in the inventory */
    index: number;
}