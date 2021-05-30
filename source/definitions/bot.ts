import { ItemName, MonsterName, SlotType } from "alclient-mongo"

export type Strategy = {
    [T in MonsterName]?: {
        /** A strategy for attacking the given monster. */
        attack: () => Promise<void>
        /** A strategy for moving with the given monster. */
        move: () => Promise<void>
        /** A list of items to equip for dealing with the given monster */
        equipment?: { [T in SlotType]?: ItemName }
        /** If set to true, we will attack by default whenever we have nothing else to do */
        attackWhileIdle?: boolean
        /** If set to true, we won't do it unless it's also the priest's target */
        requirePriest?: boolean
    }
}

export type ItemLevelInfo = {
    /** Items this level and under will be sold */
    [T in ItemName]?: number
}