import AL from "alclient-mongo"
import { FRIENDLY_ROGUES, getMonsterHuntTargets, getPriority1Entities, getPriority2Entities, LOOP_MS, sleep, startAvoidStacking, startBuyLoop, startCompoundLoop, startElixirLoop, startEventLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startUpgradeLoop } from "../base/general.js"
import { attackTheseTypes } from "../base/ranger.js"
import { Information, Strategy } from "../definitions/bot.js"
import { partyLeader, partyMembers } from "./party.js"

const DEFAULT_TARGET: AL.MonsterName = "crab"

export const DEFAULT_REGION: AL.ServerRegion = "US"
export const DEFAULT_IDENTIFIER: AL.ServerIdentifier = "II"

export async function getTarget(bot: AL.Character, strategy: Strategy, information: Information): Promise<AL.MonsterName> {
    for (const entity of await getPriority1Entities(bot)) {
        if (!strategy[entity.type]) continue // No strategy
        if (strategy[entity.type].requirePriest && bot.ctype !== "priest" && information.priest.target !== entity.type) continue // Need priest

        return entity.type
    }

    for (const entity of await getPriority2Entities(bot)) {
        if (!strategy[entity.type]) continue // No strategy
        if (strategy[entity.type].requirePriest && bot.ctype !== "priest" && information.priest.target !== entity.type) continue // Need priest
        if (bot.G.monsters[entity.type].cooperative !== true && entity.target && ![information.merchant.bot.id, information.warrior.bot.id, information.priest.bot.id, information.merchant.bot.id].includes(entity.target)) continue // It's targeting someone else

        return entity.type
    }

    for (const type of await getMonsterHuntTargets(bot)) {
        if (!strategy[type]) continue // We don't have a strategy for the given type
        if (strategy[type].requirePriest && bot.ctype !== "priest" && information.priest.target !== type) continue // Need priest

        return type
    }

    return DEFAULT_TARGET
}

export async function startMerchant(bot: AL.Merchant, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)
}

export async function startPriest(bot: AL.Priest, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)
}

export async function startRanger(bot: AL.Ranger, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)

    const idleTargets: AL.MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as AL.MonsterName].attackWhileIdle) continue
        idleTargets.push(t as AL.MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
                || bot.isOnCooldown("scare") // We don't have scare ready
            ) {
                // We are dead
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            if (information.ranger.target) {
                // Equipment
                if (strategy[information.ranger.target].equipment) {
                    for (const s in strategy[information.ranger.target].equipment) {
                        const slot = s as AL.SlotType
                        const itemName = strategy[information.ranger.target].equipment[slot]
                        const wType = bot.G.items[itemName].wtype

                        if (bot.G.classes[bot.ctype].doublehand[wType]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.slots["mainhand"]) {
                            const mainhandItem = bot.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.slots[slot]
                            || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i !== undefined) await bot.equip(i, slot)
                        }
                    }
                }

                // Strategy
                await strategy[information.ranger.target].attack()
            }

            // Idle strategy
            await attackTheseTypes(bot, idleTargets, information.friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    const friendlyRogues = FRIENDLY_ROGUES
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            // Get a MH if we're on the default server and we don't have one
            if (!bot.s.monsterhunt && bot.server.name == DEFAULT_IDENTIFIER && bot.server.region == DEFAULT_REGION) {
                await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1 })
                await bot.getMonsterHuntQuest()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                return
            }

            // Turn in our monsterhunt if we can
            if (bot.s.monsterhunt && bot.s.monsterhunt.c == 0) {
                await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1 })
                await bot.finishMonsterHuntQuest()
                await bot.getMonsterHuntQuest()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                return
            }

            // Get some buffs from rogues
            if (!bot.s.rspeed) {
                const friendlyRogue = await AL.PlayerModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, lastSeen: { $gt: Date.now() - 120000 }, name: { $in: friendlyRogues } }).lean().exec()
                if (friendlyRogue) {
                    await bot.smartMove(friendlyRogue, { getWithin: 20 })
                    if (!bot.s.rspeed) await sleep(2500)
                    if (!bot.s.rspeed) friendlyRogues.splice(friendlyRogues.indexOf(friendlyRogue.id), 1) // They're not giving rspeed, remove them from our list
                    bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                    return
                }
            }

            // Move to our target
            if (information.ranger.target) strategy[information.ranger.target].move()
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
    }
    moveLoop()
}

export async function startWarrior(bot: AL.Warrior, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)
}

export async function startShared(bot: AL.Character, strategy: Strategy, information: Information): Promise<void> {
    bot.socket.on("magiport", async (data: { name: string }) => {
        if (partyMembers.includes(data.name)) {
            if (bot.c?.town) await bot.stopWarpToTown()
            await bot.acceptMagiport(data.name)
            return
        }
    })

    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    startEventLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    if (bot.ctype !== "merchant") startPartyLoop(bot, partyLeader, partyMembers)
    startPontyLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)
    if (bot.ctype !== "merchant") startSendStuffDenylistLoop(bot, information.merchant.name)
    startUpgradeLoop(bot)

    async function targetLoop(): Promise<void> {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const newTarget = await getTarget(bot, strategy, information)
            switch (bot.ctype) {
            case "priest":
                if (newTarget !== information.priest.target) bot.stopSmartMove()
                information.priest.target = newTarget
                break
            case "merchant":
                if (newTarget !== information.merchant.target) bot.stopSmartMove()
                information.merchant.target = newTarget
                break
            case "ranger":
                if (newTarget !== information.ranger.target) bot.stopSmartMove()
                information.ranger.target = newTarget
                break
            case "warrior":
                if (newTarget !== information.warrior.target) bot.stopSmartMove()
                information.warrior.target = newTarget
                break
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { await targetLoop() }, 1000)
    }
    targetLoop()
}