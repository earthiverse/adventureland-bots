import AL, { Character, ItemName, Mage, Ranger } from "alclient"
import { startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, startAvoidStacking, startScareLoop } from "../base/general.js"
import { mainCrabs, offsetPositionParty } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { ItemLevelInfo } from "../definitions/bot.js"

const LOOP_MS = 10

export async function startLulzMage(bot: Mage, friends: Character[], replenishables: [ItemName, number][], itemsToSell: ItemLevelInfo) {
    startAvoidStacking(bot)
    startBuyLoop(bot, new Set(), replenishables)
    startHealLoop(bot)
    startLootLoop(bot, friends)
    startPartyLoop(bot, "earthMer")
    startScareLoop(bot)
    startSellLoop(bot, itemsToSell)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            await attackTheseTypesMage(bot, ["crab"], friends)
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // If we need to sell, or buy more potions, go to main
            if (bot.esize <= 2 || bot.countItem("hpot1") < 10 || bot.countItem("mpot1") < 10) {
                await bot.smartMove("hpot1", { getWithin: 300 })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, Math.min(...bot.pings) * 2))
                return
            }

            // Go farm
            if (bot.party) {
                await bot.smartMove(offsetPositionParty(mainCrabs, bot))
            } else {
                await bot.smartMove(mainCrabs)
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

export async function startLulzRanger(bot: Ranger, friends: Character[], replenishables: [ItemName, number][], itemsToSell: ItemLevelInfo) {
    startAvoidStacking(bot)
    startBuyLoop(bot, new Set(), replenishables)
    startHealLoop(bot)
    startLootLoop(bot, friends)
    startPartyLoop(bot, "earthMer")
    startScareLoop(bot)
    startSellLoop(bot, itemsToSell)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            await attackTheseTypesRanger(bot, ["crab"], friends, { disableHuntersMark: true, disableSupershot: true })
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // If we need to sell, or buy more potions, go to main
            if (bot.esize <= 2 || bot.countItem("hpot1") < 10 || bot.countItem("mpot1") < 10) {
                await bot.smartMove("hpot1", { getWithin: 300 })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, Math.min(...bot.pings) * 2))
                return
            }

            // Go farm
            if (bot.party) {
                await bot.smartMove(offsetPositionParty(mainCrabs, bot))
            } else {
                await bot.smartMove(mainCrabs)
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}