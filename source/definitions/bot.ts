import AL from "alclient-mongo"

export type Strategy = {
    [T in AL.MonsterName]?: {
        /** A strategy for attacking the given monster. */
        attack: () => Promise<void>
        /** A strategy for moving with the given monster. */
        move: () => Promise<void>
        /** A list of items to equip for dealing with the given monster */
        equipment?: { [T in AL.SlotType]?: AL.ItemName }
        /** If set to true, we will attack by default whenever we have nothing else to do */
        attackWhileIdle?: boolean
        /** If set to true, we won't do it unless it's also the priest's target */
        requirePriest?: boolean
    }
}

export type Information = {
    friends: [AL.Merchant, AL.Character, AL.Character, AL.Character]
    merchant: {
        bot: AL.Merchant
        name: string
        target: AL.MonsterName
    }
    bot1: {
        bot: AL.Character
        name: string
        target: AL.MonsterName
    }
    bot2: {
        bot: AL.Character
        name: string
        target: AL.MonsterName
    }
    bot3: {
        bot: AL.Character
        name: string
        target: AL.MonsterName
    }
}

export type ItemLevelInfo = {
    /** Items this level and under will be sold */
    [T in AL.ItemName]?: number
}