import { ItemInfo, MonsterType, PositionReal, Entity, NPCName, StatusInfo, BankPackType, ItemName, CharacterType, NPCType, IPosition } from "./adventureland"

export type TargetPriorityList = {
    [T in MonsterType]?: TargetPriorityInfo;
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
    target?: MonsterType | NPCType | CharacterType;
    position?: PositionReal;
    range?: number;
}

export type MonsterSpawnPosition = PositionReal & {
    monster: MonsterType;
}

export type EmptyBankSlots = {
    pack: Exclude<BankPackType, "gold">;
    index: number;
}

export type PriorityEntity = {
    id: string;
    priority: number;
}

export type OtherInfo = {
    party: {
        [T in string]?: PositionReal & {
            lastSeen: string;
            shouldSwitchServer: boolean;
            monsterHuntTargets: MonsterType[];
            items: MyItemInfo[];
            goldm: number;
            last_ms: Date;
            luckm: number;
            attack: number;
            frequency: number;
            s: StatusInfo;
        }
    };
    npcs: {
        [T in NPCName]?: PositionReal & {
            lastSeen: string;
        }
    };
    players: {
        [T in string]?: Entity & {
            lastSeen: string;
        }
    };
    monsters: {
        [T in MonsterType]?: PositionReal & {
            id: string;
        }
    };
}

export type ItemLevelInfo = {
    /** Items this level and under will be sold */
    [T in ItemName]?: number
}

export type MyItemInfo = ItemInfo & {
    /** Specifies the index of the item in the inventory */
    index: number;
}