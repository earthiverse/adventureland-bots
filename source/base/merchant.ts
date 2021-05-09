import AL from "alclient-mongo"
import { ITEMS_TO_HOLD, LOOP_MS } from "./general.js"

export const MERCHANT_GOLD_TO_HOLD = 100_000_000
export const MERCHANT_ITEMS_TO_HOLD: AL.ItemName[] = [
    ...ITEMS_TO_HOLD,
    // MH Tokens
    "monstertoken",
    // Scrolls
    "cscroll0", "cscroll1", "cscroll2", "cscroll3", "scroll0", "scroll1", "scroll2", "scroll3", "scroll4", "strscroll", "intscroll", "dexscroll",
    // Fishing Rod and Pickaxe
    "pickaxe", "rod",
    // Main Items
    "dartgun", "wbook1"
]

export function startMluckLoop(bot: AL.Merchant): void {
    async function mluckLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { mluckLoop() }, 10)
                return
            }

            if (bot.canUse("mluck")) {
                if (!bot.s.mluck || bot.s.mluck.f !== bot.id) await bot.mluck(bot.id) // mluck ourselves

                for (const [, player] of bot.players) {
                    if (AL.Tools.distance(bot, player) > bot.G.skills.mluck.range) continue // Too far away to mluck
                    if (player.npc) continue // It's an NPC, we can't mluck NPCs.

                    if (!player.s.mluck) {
                        await bot.mluck(player.id) // Give the mluck 
                    } else if (!player.s.mluck.strong && player.s.mluck.f !== bot.id) {
                        await bot.mluck(player.id) // Steal the mluck
                    } else if ((!player.s.mluck.strong && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))
                        || (player.s.mluck.strong && player.s.mluck.f == bot.id && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))) {
                        await bot.mluck(player.id) // Extend the mluck
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { mluckLoop() }, LOOP_MS)
    }
    mluckLoop()
}