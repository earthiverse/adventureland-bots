import AL from "alclient-mongo"
import { LOOP_MS } from "./general.js"

export function startPartyHealLoop(bot: AL.Priest, members: AL.Character[]): void {
    async function partyHealLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { partyHealLoop() }, 10)
                return
            }

            if (bot.c.town) {
                setTimeout(async () => { partyHealLoop() }, bot.c.town.ms)
                return
            }

            if (bot.canUse("partyheal")) {
                for (const friend of members) {
                    if (friend.party !== bot.party) continue // Our priest isn't in the same party!?
                    if (friend.rip) continue // Party member is already dead
                    if (friend.hp < friend.max_hp * 0.5) {
                        // Someone in our party has low HP
                        await bot.partyHeal()
                        break
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyHealLoop() }, Math.max(bot.getCooldown("partyheal"), LOOP_MS))
    }
    partyHealLoop()
}