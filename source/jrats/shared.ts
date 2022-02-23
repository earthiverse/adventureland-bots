import AL, { Character, ItemName, Ranger } from "alclient"
import { startAvoidStacking, startBuyLoop, startCompoundLoop, startCraftLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, ITEMS_TO_HOLD, startUpgradeLoop, LOOP_MS, sleep, moveInCircle, goToKiteMonster } from "../base/general.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { attackTheseTypesRanger } from "../base/ranger.js"

async function startShared(bot: Character, merchant: string, friends: Character[]) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startCraftLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot, friends)
    if (bot.ctype !== "merchant") {
        if (bot.id == partyLeader) {
            startPartyLoop(bot, partyLeader, partyMembers)
        } else {
            bot.timeouts.set("partyLoop", setTimeout(async () => { startPartyLoop(bot, partyLeader, partyMembers) }, 2000))
        }
    }
    startScareLoop(bot)
    startSellLoop(bot)
    if (bot.ctype !== "merchant") startSendStuffDenylistLoop(bot, [merchant], ITEMS_TO_HOLD, 10_000_000)
    startUpgradeLoop(bot)
}

export async function startRanger(bot: Ranger, merchant: string, friends: Character[], mainhand: ItemName, offhand: ItemName) {
    startShared(bot, merchant, friends)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            const promises: Promise<unknown>[] = []
            if (bot.slots.mainhand?.name !== mainhand) {
                const item = bot.locateItem(mainhand, bot.items, { locked: true, returnHighestLevel: true })
                promises.push(bot.equip(item, "mainhand"))
            }
            if (bot.slots.offhand?.name !== offhand) {
                const item = bot.locateItem(offhand, bot.items, { locked: true, returnHighestLevel: true })
                promises.push(bot.equip(item, "offhand"))
            }

            // Idle strategy
            promises.push(attackTheseTypesRanger(bot, ["jrat"], friends, { disableHuntersMark: true }))
            await Promise.all(promises)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot")))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, Math.min(...bot.pings) * 2))
                return
            }

            if (bot.map !== "jail") await bot.warpToJail()

            const jRats = bot.getEntities({ type: "jrat" })
            if (jRats.length) goToKiteMonster(bot, { kiteDistance: bot.G.monsters.jrat.range * 2, type: "jrat" })
            else if (!bot.smartMoving) { bot.smartMove("jrat") }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}