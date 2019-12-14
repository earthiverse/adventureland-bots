import { MapName, ItemInfo, MonsterType, NPCType, IPosition, IPositionReal, IEntity, NPCName, ICharacter, StatusInfo, BankPackType } from "./adventureland";

export type TargetPriorityList = {
    [T in MonsterType]?: TargetPriorityInfo;
};

export interface TargetPriorityInfo {
    /** The higher the priority, the more likely we are to target it. */
    priority: number;
    /** When smart moving past the monster, if true, we won't attack the monster. */
    holdAttack?: boolean;
    /** If set to false, we will not attack the entity if we are within their attacking range */
    attackInRange?: boolean;
    /** When smart moving to this monster, we won't move after we reach the destination. */
    holdPosition?: boolean;
    /** When smart moving to this monster, if true, we will stop when we see one within attacking range. */
    stopOnSight?: boolean;
    /** The map where we will move to find this monster. */
    map?: MapName;
    /** The x position where we will move to find this monster. */
    x?: number;
    /** The y position where we will move to find this monster. */
    y?: number;
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
            canMonsterHunt: boolean
            items: MyItemInfo[]
            s: StatusInfo
        }
    }
    npcs: {
        [T in NPCName]?: IPositionReal
    }
    players: {
        [T in string]?: IEntity
    }
}

export type MyItemInfo = ItemInfo & {
    /**
     * Specifies the index of the 
     */
    index: number;
}