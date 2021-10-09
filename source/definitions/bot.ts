import { Character, CharacterType, ItemName, Merchant, MonsterName, SlotType } from "alclient"

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
        /** If set to true, we won't do it unless we also have a character of the given type targeting */
        requireCtype?: CharacterType
    }
} & {
    defaultTarget?: MonsterName
}

export type Information = {
    friends: [Merchant, Character, Character, Character]
    merchant: {
        bot: Merchant
        name: string
        nameAlt: string
        target: MonsterName
    }
    bot1: {
        bot: Character
        name: string
        target: MonsterName
    }
    bot2: {
        bot: Character
        name: string
        target: MonsterName
    }
    bot3: {
        bot: Character
        name: string
        target: MonsterName
    }
}

export type ItemLevelInfo = {
    /** Items this level and under will be sold */
    [T in ItemName]?: number
}

export type CryptData = {
    /** Name of the instance, for entering */
    instance: string
    /** How many of the given monsters are left? */
    remaining: {
        [T in MonsterName]?: number
    }
}