import AL from "alclient-mongo"
import { getMonsterHuntTargets, getPriority1Entities, getPriority2Entities, LOOP_MS, startAvoidStacking, startBuyLoop, startCompoundLoop, startElixirLoop, startEventLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop } from "../base/general.js"
import { attackTheseTypes } from "../base/ranger.js"
import { Information, Strategy } from "../definitions/bot.js"
import { partyLeader, partyMembers } from "./party.js"

const DEFAULT_TARGET:AL.MonsterName = "crab"

export const REGION: AL.ServerRegion = "US"
export const IDENTIFIER: AL.ServerIdentifier = "I"

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

    const idleTargets:AL.MonsterName[] = []
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
    startSellLoop(bot)
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