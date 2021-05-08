import { ItemName, MonsterName, SlotType } from "alclient-mongo"

export type Strategy = {
    [T in MonsterName]?: {
        /** A strategy for attacking the given monster. The number returned is the cooldown. This function will be called again after this many ms. */
        attack: () => Promise<number>
        /** A strategy for moving with the given monster. The number returned is the cooldown. This function will be called again after this many ms. */
        move: () => Promise<number>
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