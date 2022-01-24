import AL, { Character, Mage } from "alclient"
import { FRIENDLY_ROGUES, goToNearestWalkableToMonster, ITEMS_TO_HOLD, LOOP_MS, sleep, startAvoidStacking, startBuyLoop, startCompoundLoop, startCraftLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startUpgradeLoop } from "../base/general.js"
import { desertlandPorcupines } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { partyLeader, partyMembers } from "../base/party.js"

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

export async function startMage(bot: Mage, merchant: string, friends: Character[]) {
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

            // Idle strategy
            await attackTheseTypesMage(bot, ["porcupine"], friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    const friendlyRogues = FRIENDLY_ROGUES
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

            // Get some buffs from rogues
            if (!bot.s.rspeed) {
                const friendlyRogue = await AL.PlayerModel.findOne({ lastSeen: { $gt: Date.now() - 120_000 }, name: { $in: friendlyRogues }, serverIdentifier: bot.server.name, serverRegion: bot.server.region }).lean().exec()
                if (friendlyRogue) {
                    await bot.smartMove(friendlyRogue, { getWithin: 20 })
                    if (!bot.s.rspeed) await sleep(2500)
                    if (!bot.s.rspeed) friendlyRogues.splice(friendlyRogues.indexOf(friendlyRogue.id), 1) // They're not giving rspeed, remove them from our list
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                    return
                }
            }

            // Get a luck elixir
            if (!bot.slots.elixir
                     && !(bot.hasItem("computer") || bot.hasItem("supercomputer"))
                     && bot.canBuy("elixirluck", { ignoreLocation: true })
                     && !bot.isFull()) {
                await bot.smartMove("elixirluck")
            }

            await goToNearestWalkableToMonster(bot, ["porcupine"], desertlandPorcupines, bot.range - 25).catch(() => { /** Suppress errors */ })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}