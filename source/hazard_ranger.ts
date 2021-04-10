import { NPC_INTERACTION_DISTANCE, PRIEST_ITEMS_TO_HOLD, RANGER_ITEMS_TO_HOLD } from "./constants.js"
import { EntityData } from "./definitions/adventureland-server"
import { IPosition, MonsterName } from "./definitions/adventureland.js"
import { Merchant } from "./Merchant.js"
import { PingCompensatedPlayer } from "./PingCompensatedPlayer.js"
import { Priest } from "./Priest.js"
import { Ranger } from "./Ranger.js"
import { Tools } from "./Tools.js"


const FARMING_TARGET: MonsterName = "mummy"
const FARMING_POSITION: IPosition = { map: "spookytown", x: 250, y: -1129 }

let earthMer: Merchant
let earthPri: Priest
let earthPri2: Priest
let earthiverse: Ranger

async function startPriest(bot: Priest) {
    async function attackLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.rip) {
                setTimeout(async () => { attackLoop() }, 1000)
                return
            }

            if (bot.canUse("heal")) {
                // Heal party members if they are close
                let target: PingCompensatedPlayer
                for (const friend of [earthMer, earthiverse, earthPri, earthPri2]) {
                    if (!friend) continue // Not up
                    if (friend.character.hp > friend.character.max_hp * 0.8) continue // Lots of health, no need to heal
                    if (Tools.distance(bot.character, friend.character) > bot.character.range) continue // Too far away to heal

                    target = friend
                    break
                }
                if (target) {
                    await bot.heal(target.character.id)
                    setTimeout(async () => { attackLoop() }, bot.getCooldown("heal"))
                    return
                }
            }

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }

            if (bot.canUse("attack")) {
                const targets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.target !== earthMer.character.id) continue // Only attack those targeting our merchant
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    if (entity.type !== FARMING_TARGET) continue

                    targets.push(entity)

                    const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                    if (minimumDamage > entity.hp) {
                        // Stop looking for another one to attack, since we can kill this one in one hit.
                        targets[0] = entity
                        break
                    }
                }

                if (targets.length) {
                    if (await Tools.isGuaranteedKill(bot.character, targets[0])) {
                        for (const bot of [earthMer, earthiverse, earthPri, earthPri2]) {
                            if (!bot) continue
                            bot.entities.delete(targets[0].id)
                        }
                    }
                    await bot.attack(targets[0].id)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) return

            if (Tools.distance(bot.character, FARMING_POSITION) > bot.character.range / 2) {
                const NEW_FARMING_POSITION = {
                    map: FARMING_POSITION.map,
                    x: FARMING_POSITION.x - bot.character.range / 2 + (Math.random() * bot.character.range),
                    y: FARMING_POSITION.y - bot.character.range / 2 + (Math.random() * bot.character.range)
                }

                await bot.smartMove(NEW_FARMING_POSITION)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!earthMer || earthMer.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(earthMer.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(earthMer.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || PRIEST_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(earthMer.character.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()

    async function partyHealLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.c.town) {
                setTimeout(async () => { partyHealLoop() }, bot.character.c.town.ms)
                return
            }

            if (bot.canUse("partyheal")) {
                for (const friend of [earthMer, earthiverse, earthPri, earthPri2]) {
                    if (!friend || !friend.party || !friend.party.list.includes(bot.character.id)) continue // We aren't in the party!?
                    if (friend.character.hp < friend.character.max_hp * 0.5) {
                        // Someone in our party has low HP
                        await bot.partyHeal()
                        break
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyHealLoop() }, Math.max(bot.getCooldown("partyheal"), 10))
    }
    partyHealLoop()
}

async function startRanger(bot: Ranger) {
    async function attackLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.rip) {
                setTimeout(async () => { attackLoop() }, 1000)
                return
            }

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }

            // TODO: Change to target zombies with firehazard strategies

            if (bot.canUse("attack")) {
                const targets: EntityData[] = []
                const threeshotTargets: EntityData[] = []
                const fiveshotTargets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "porcupine") continue
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range
                    if (entity.cooperative !== true && entity.target && entity.target !== bot.character.id) continue // It's targeting someone else

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    targets.push(entity)

                    // If we can kill enough monsters in one shot, let's try to do that
                    const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                    if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(entity)
                    if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(entity)
                }

                if (fiveshotTargets.length >= 5 && bot.canUse("5shot")) {
                    await bot.fiveShot(fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id)
                } else if (threeshotTargets.length >= 3 && bot.canUse("3shot")) {
                    await bot.threeShot(threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id)
                } else if (targets.length) {
                    if (bot.canUse("huntersmark")) {
                        await bot.huntersMark(targets[0].id)
                    }

                    // If we can do more damage with a piercingshot, use that
                    const gInfo = bot.G.skills.piercingshot
                    const piercingShotEntity = { ...targets[0] }
                    piercingShotEntity.armor -= gInfo.apiercing
                    if (bot.canUse("piercingshot")
                        && Tools.calculateDamageRange(bot.character, piercingShotEntity)[0] * gInfo.damage_multiplier > Tools.calculateDamageRange(bot.character, targets[0])[0]) {
                        await bot.piercingShot(targets[0].id)
                    } else {
                        await bot.attack(targets[0].id)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) return

            // TODO: Change to target zombies with firehazard strategies

            await bot.smartMove("porcupine")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 1000)
    }
    moveLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!earthMer || earthMer.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(earthMer.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(earthMer.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || RANGER_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(earthMer.character.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()
}