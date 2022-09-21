import { PingCompensatedCharacter, ItemName, LocateItemFilters } from "alclient"
import { Strategy, LoopName, Loop } from "../context.js"

export class FirehazardEquipStrategy implements Strategy<PingCompensatedCharacter> {
    public loops = new Map<LoopName, Loop<PingCompensatedCharacter>>()

    public item: ItemName
    public filters: LocateItemFilters

    public constructor(item: ItemName, filters?: LocateItemFilters) {
        this.item = item
        this.filters = filters

        this.loops.set("equip", {
            fn: async (bot: PingCompensatedCharacter) => { await this.equipBest(bot) },
            interval: 250
        })
    }

    public equipBest(bot: PingCompensatedCharacter) {
        const monsters = bot.getEntities({
            hpLessThan: 10_000,
            targetingMe: true,
            willBurnToDeath: true
        })

        const shouldEquipItem = monsters.length > 0
        if (shouldEquipItem) {
            const locate = bot.locateItem(this.item, bot.items, this.filters)
            if (locate === undefined) return // Assume we have it equipped
            return bot.equip(locate, "mainhand")
        } else {
            // Equip the best fire weapon we have
            let item: ItemName
            switch (bot.ctype) {
                case "mage":
                case "priest":
                    item = "firestaff"
                    break
                case "ranger":
                    item = "firebow"
                    break
                case "warrior":
                    item = "fireblade"
                    break
            }
            const locate = bot.locateItem(item, bot.items, { returnHighestLevel: true })
            if (locate === undefined) return // Assume we have it
            const itemInfo = bot.items[locate]
            if (bot.slots.mainhand && bot.slots.mainhand.name == item && bot.slots.mainhand.level > itemInfo.level) return // We already have a higher level one equipped
            return bot.equip(locate, "mainhand")
        }
    }
}