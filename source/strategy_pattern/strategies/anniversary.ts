import { Character, IPosition } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export function canDoAnniversaryKiss(bot: Character): boolean {
    return (
        !!bot.S.anniversary?.live &&
        !!bot.S.anniversary?.active &&
        !bot.s.hopsickness &&
        !bot.s.realmfatigue &&
        !!bot.s.anniversary_visit &&
        bot.s.anniversary_visit.round === bot.S.anniversary.round &&
        bot.s.anniversary_visit.realm === `${bot.serverData.region} ${bot.serverData.name}`
    )
}

export class FindAnniversaryTargetStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => {
                await this.move(bot)
            },
            interval: 250,
        })
    }

    private async move(bot: Type) {
        if (!canDoAnniversaryKiss(bot)) return

        const position = bot.players.get(bot.S.anniversary.id) ?? (bot.S.anniversary as IPosition)

        // Move to player
        await bot.smartMove(position, { getWithin: 50 })

        // Kiss player
        if (bot.getPlayer({ id: bot.S.anniversary.id, withinRange: 80 })) {
            await bot.kiss(bot.S.anniversary.id)
        }
    }
}
