import AL from "alclient"

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
        /** If set to true, we won't do it unless we also have a character of the given type targeting */
        requireCtype?: AL.CharacterType
    }
}

export type Information = {
    friends: [AL.Merchant, AL.Character, AL.Character, AL.Character]
    merchant: {
        bot: AL.Merchant
        name: string
        nameAlt: string
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

export type CryptData = {
    /** Name of the instance, for entering */
    instance: string
    /** How many of the given monsters are left? */
    remaining: {
        [T in AL.MonsterName]?: number
    }
}