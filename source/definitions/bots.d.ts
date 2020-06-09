import { ItemInfo, MonsterName, PositionReal, Entity, NPCName, StatusInfo, BankPackType, ItemName, CharacterType, NPCType, IPosition } from "./adventureland"

export type TargetPriorityList = {
    [T in MonsterName]?: TargetPriorityInfo;
};

export interface TargetPriorityInfo {
    /** The higher the priority, the more likely we are to target it. */
    priority: number;
    /** If true, we will only attack the target as a team */
    coop?: CharacterType[];
    /** When smart moving past the monster, if true, we won't attack the monster. */
    holdAttackWhileMoving?: boolean;
    /** If set to true, we will not attack the entity if we are within their attacking range */
    holdAttackInEntityRange?: boolean;
    /** If true, we won't move to attack the monsters. Use this with map, x, and y to go to a safe (unreachable) spot. */
    holdPositionFarm?: boolean;

    farmingPosition?: PositionReal;
    /* A list of ideal items to equip to bettter deal with these monsters */
    equip?: ItemName[];
}

export type MovementTarget = {
    target?: MonsterName | NPCType | CharacterType;
    position?: PositionReal;
    range?: number;
}

export type MonsterSpawnPosition = PositionReal & {
    monster: MonsterName;
}

export type EmptyBankSlots = {
    pack: Exclude<BankPackType, "gold">;
    index: number;
}

export type PriorityEntity = {
    id: string;
    priority: number;
}

export type MonstersInfo = {
    [T in MonsterName]?: PositionReal & {
        id: string;
        lastSeen: Date;
    }
}

export type NPCInfo = {
    [T in NPCName]?: PositionReal & {
        lastSeen: Date;
    }
}

export type PartyInfo = {
    [T in string]?: PositionReal & {
        lastSeen: Date;
        shouldSwitchServer: boolean;
        monsterHuntTargets: MonsterName[];
        items: InventoryItemInfo[];
        goldm: number;
        last_ms: Date;
        luckm: number;
        attack: number;
        frequency: number;
        s: StatusInfo;
    }
}

export type PlayersInfo = {
    [T in string]?: Partial<Entity> & PositionReal & {
        lastSeen: Date;
    }
}

export type ItemLevelInfo = {
    /** Items this level and under will be sold */
    [T in ItemName]?: number
}

export type InventoryItemInfo = ItemInfo & {
    /** Specifies the index of the item in the inventory */
    index: number;
}

export type BankItemInfo = InventoryItemInfo & {
    pack: BankPackType | "items";
}