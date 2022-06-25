import AL, { Character, ItemName, Mage, Ranger, Warrior } from "alclient"
import { startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, startAvoidStacking, startScareLoop, goToNearestWalkableToMonster2 } from "../base/general.js"
import { mainBeesNearGoos, mainBeesNearTunnel, offsetPositionParty } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { attackTheseTypesWarrior } from "../base/warrior.js"
import { ItemLevelInfo } from "../definitions/bot.js"

const LOOP_MS = 10

export async function startLulzBeeMage(bot: Mage, friends: Character[], replenishables: [ItemName, number][], itemsToSell: ItemLevelInfo) {
    startAvoidStacking(bot) // ok
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

            await attackTheseTypesMage(bot, ["bee"], friends)
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
                await bot.smartMove("hpot1", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
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
                await bot.smartMove(offsetPositionParty(mainBeesNearGoos, bot))
            } else {
                await bot.smartMove(mainBeesNearGoos)
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

export async function startLulzBeeRanger(bot: Ranger, friends: Character[], replenishables: [ItemName, number][], itemsToSell: ItemLevelInfo) {
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

            await attackTheseTypesRanger(bot, ["bee"], friends, { disableHuntersMark: true, disableSupershot: true })
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
            if (bot.esize <= 2 || ((bot.countItem("hpot1") < 10 || bot.countItem("mpot1") < 10) && bot.gold > 100_000)) {
                await bot.smartMove("hpot1", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
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
                await bot.smartMove(offsetPositionParty(mainBeesNearGoos, bot))
            } else {
                await bot.smartMove(mainBeesNearGoos)
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

export async function startLulzBeeWarrior(bot: Warrior, friends: Character[], replenishables: [ItemName, number][], itemsToSell: ItemLevelInfo) {
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

            await attackTheseTypesWarrior(bot, ["bee"], friends)
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
            if (bot.esize <= 2 || ((bot.countItem("hpot1") < 10 || bot.countItem("mpot1") < 10) && bot.gold > 100_000)) {
                await bot.smartMove("hpot1", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
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
            await goToNearestWalkableToMonster2(bot, ["bee"], mainBeesNearTunnel)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}