import AL, { Character, Rogue } from "alclient"
import { startAvoidStacking, startBuyLoop, startCompoundLoop, startCraftLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, ITEMS_TO_HOLD, startUpgradeLoop, LOOP_MS, goToNearestWalkableToMonster2, calculateAttackLoopCooldown } from "../base/general.js"
import { mainSpiders } from "../base/locations.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { attackTheseTypesRogue, startRSpeedLoop } from "../base/rogue.js"

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

export async function startRogue(bot: Rogue, merchant: string, friends: Character[]) {
    startShared(bot, merchant, friends)

    startRSpeedLoop(bot, { enableGiveToStrangers: true })

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            // Idle strategy
            await attackTheseTypesRogue(bot, ["spider"], friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, calculateAttackLoopCooldown(bot)))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.volatile.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, Math.min(...bot.pings) * 2))
                return
            }

            // Get a luck elixir
            if (!bot.slots.elixir
                     && !(bot.hasItem("computer") || bot.hasItem("supercomputer"))
                     && bot.canBuy("elixirluck", { ignoreLocation: true })
                     && !bot.isFull()) {
                await bot.smartMove("elixirluck")
            }

            await goToNearestWalkableToMonster2(bot, ["spider"], mainSpiders)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
    }
    moveLoop()
}