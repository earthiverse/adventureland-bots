import { EntityData, PlayerData } from "./definitions/adventureland-server.js"
import { MonsterName, ServerIdentifier, ServerRegion, SlotType } from "./definitions/adventureland.js"
import { Strategy } from "./definitions/bot.js"
import { NodeData } from "./definitions/pathfinder.js"
import { Game, Merchant, Priest, Ranger, Warrior } from "./game.js"
import { Pathfinder } from "./pathfinder.js"
import { Tools } from "./tools.js"

let ranger: Ranger
let rangerTarget: MonsterName
let warrior: Warrior
let warriorTarget: MonsterName
let priest: Priest
let priestTarget: MonsterName
let merchant: Merchant
// let merchantTarget: MonsterName

function getMonsterHuntTarget(strategy: Strategy): MonsterName {
    let target: MonsterName
    let timeRemaining: number = Number.MAX_VALUE
    for (const bot of [ranger, warrior, priest]) {
        if (!bot.character.s.monsterhunt) continue // Character does not have a monster hunt
        if (bot.character.s.monsterhunt.c == 0) continue // Character is finished the monster hunt
        if (!strategy[bot.character.s.monsterhunt.id]) continue // We don't have a strategy for the monster

        // If there are special monsters, do those first
        if (["goldenbat"].includes(bot.character.s.monsterhunt.id)) return bot.character.s.monsterhunt.id

        if (bot.character.s.monsterhunt.ms < timeRemaining) {
            target = bot.character.s.monsterhunt.id
            timeRemaining = bot.character.s.monsterhunt.ms
        }
    }
    return target
}

async function startRanger(bot: Ranger) {
    console.info(`Starting ranger (${bot.character.id})`)

    const defaultAttackStrategy = async (mtype: MonsterName): Promise<number> => {
        if (bot.getCooldown("attack") == 0) {
            const targets: EntityData[] = []
            const threeshotTargets: EntityData[] = []
            const fiveshotTargets: EntityData[] = []
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(entity)

                // If we can kill enough monsters in one shot, let's try to do that
                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(entity)
                if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(entity)
            }

            if (fiveshotTargets.length >= 5 && bot.character.mp >= bot.G.skills["5shot"].mp) {
                await bot.fiveShot(fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id)
                // Remove from other characters if we're going to kill it
                for (const target of [fiveshotTargets[0], fiveshotTargets[1], fiveshotTargets[2], fiveshotTargets[3], fiveshotTargets[4]]) {
                    if (Tools.isGuaranteedKill(bot.character, target)) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(target.id)
                        }
                    }
                }
            } else if (threeshotTargets.length >= 3 && bot.character.mp >= bot.G.skills["3shot"].mp) {
                await bot.threeShot(threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id)
                // Remove from other characters if we're going to kill it
                for (const target of [threeshotTargets[0], threeshotTargets[1], threeshotTargets[2]]) {
                    if (Tools.isGuaranteedKill(bot.character, target)) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(target.id)
                        }
                    }
                }
            } else if (targets.length) {
                // TODO: If we can do more damage with a `piercingshot`, do it.
                await bot.attack(targets[0].id)
                // Remove from other characters if we're going to kill it
                if (Tools.isGuaranteedKill(bot.character, targets[0])) {
                    for (const bot of [ranger, priest, warrior, merchant]) {
                        bot.entities.delete(targets[0].id)
                    }
                }
            }
        }

        if (bot.getCooldown("supershot") == 0 && bot.character.mp > bot.G.skills.supershot.mp) {
            const targets: string[] = []
            for (const [id, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) > bot.character.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(id)

                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0] * bot.G.skills.supershot.damage_multiplier
                if (minimumDamage > entity.hp) {
                    // Stop looking for another one to attack, since we can kill this one in one hit.
                    targets[0] = id
                    break
                }
            }

            if (targets.length) {
                await bot.supershot(targets[0])
            }
        }

        return Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot")))
    }
    const tankAttackStrategy = async (mtype: MonsterName, tank: string) => {
        // If we have a target scare it away
        for (const [, entity] of bot.entities) {
            if (entity.target == bot.character.id) {
                await bot.scare()
                return bot.getCooldown("scare") // Don't attack until we have scare available again
            }
        }

        if (bot.getCooldown("attack") == 0) {
            const targets: EntityData[] = []
            const threeshotTargets: EntityData[] = []
            const fiveshotTargets: EntityData[] = []
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.target !== tank) continue // It's not targeting our tank
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(entity)

                // If we can kill enough monsters in one shot, let's try to do that
                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(entity)
                if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(entity)
            }

            if (fiveshotTargets.length >= 5 && bot.character.mp >= bot.G.skills["5shot"].mp) {
                await bot.fiveShot(fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id)
                // Remove from other characters if we're going to kill it
                for (const target of [fiveshotTargets[0], fiveshotTargets[1], fiveshotTargets[2], fiveshotTargets[3], fiveshotTargets[4]]) {
                    if (Tools.isGuaranteedKill(bot.character, target)) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(target.id)
                        }
                    }
                }
            } else if (threeshotTargets.length >= 3 && bot.character.mp >= bot.G.skills["3shot"].mp) {
                await bot.threeShot(threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id)
                // Remove from other characters if we're going to kill it
                for (const target of [threeshotTargets[0], threeshotTargets[1], threeshotTargets[2]]) {
                    if (Tools.isGuaranteedKill(bot.character, target)) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(target.id)
                        }
                    }
                }
            } else if (targets.length) {
                if (bot.getCooldown("huntersmark") == 0 && bot.character.mp > bot.G.skills.huntersmark.mp + bot.character.mp_cost) {
                    await bot.huntersMark(targets[0].id)
                }

                // TODO: If we can do more damage with a `piercingshot`, do it.
                await bot.attack(targets[0].id)
                // Remove from other characters if we're going to kill it
                if (Tools.isGuaranteedKill(bot.character, targets[0])) {
                    for (const bot of [ranger, priest, warrior, merchant]) {
                        bot.entities.delete(targets[0].id)
                    }
                }
            }
        }

        if (bot.getCooldown("supershot") == 0) {
            const targets: string[] = []
            for (const [id, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.target != tank) continue // It's not targeting our tank
                if (Tools.distance(bot.character, entity) > bot.character.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(id)

                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0] * bot.G.skills.supershot.damage_multiplier
                if (minimumDamage > entity.hp) {
                    // Stop looking for another one to attack, since we can kill this one in one hit.
                    targets[0] = id
                    break
                }
            }

            if (targets.length) {
                await bot.supershot(targets[0])
            }
        }

        return Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot")))
    }
    const holdPositionMoveStrategy = async (position: NodeData) => {
        try {
            if (Tools.distance(bot.character, position) > 0) await bot.smartMove(position)
        } catch (e) {
            // Suppress these errors, we expect a lot.
        }
        return 1000
    }
    const strategy: Strategy = {
        armadillo: {
            attack: async () => { return await defaultAttackStrategy("armadillo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 526, y: 1846 }) }
        },
        bee: {
            attack: async () => { return await defaultAttackStrategy("bee") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 494, y: 1101 }) },
            equipment: { "mainhand": "hbow" },
            attackWhileIdle: true
        },
        crab: {
            attack: async () => { return await defaultAttackStrategy("crab") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1202, y: -66 }) },
            equipment: { "mainhand": "hbow" },
            attackWhileIdle: true
        },
        croc: {
            attack: async () => { return await defaultAttackStrategy("croc") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 801, y: 1710 }) }
        },
        goo: {
            attack: async () => { return await defaultAttackStrategy("goo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -32, y: 787 }) },
            equipment: { "mainhand": "hbow" },
            attackWhileIdle: true
        },
        mummy: {
            attack: async () => { return await tankAttackStrategy("mummy", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 250, y: -1129 }) },
            equipment: { "mainhand": "firebow", "orb": "jacko" }
        },
        plantoid: {
            attack: async () => { return await tankAttackStrategy("plantoid", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -750, y: -125 }) },
            equipment: { "mainhand": "firebow", "orb": "jacko" }
        },
        porcupine: {
            attack: async () => { return await defaultAttackStrategy("porcupine") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -829, y: 135 }) },
            equipment: { "mainhand": "crossbow" },
            attackWhileIdle: true
        },
        pppompom: {
            attack: async () => { return await tankAttackStrategy("pppompom", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "level2n", x: 100, y: -150 }) },
            equipment: { "mainhand": "firebow", "orb": "jacko" },
        },
        scorpion: {
            attack: async () => { return await defaultAttackStrategy("scorpion") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 1578, y: -168 }) },
            equipment: { "mainhand": "firebow" },
            attackWhileIdle: true
        },
        squig: {
            attack: async () => { return await defaultAttackStrategy("squig") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1175, y: 422 }) },
            equipment: { "mainhand": "hbow" },
            attackWhileIdle: true
        },
        squigtoad: {
            attack: async () => { return await defaultAttackStrategy("squigtoad") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1175, y: 422 }) },
            equipment: { "mainhand": "crossbow" },
            attackWhileIdle: true
        }
    }

    async function targetLoop(): Promise<void> {
        let newTarget: MonsterName
        try {
            // TODO: Special 

            // Priority #2: Monster Hunts
            if (!newTarget) {
                const monsterHuntTarget = getMonsterHuntTarget(strategy)
                if (monsterHuntTarget) newTarget = monsterHuntTarget
            }

            // Stop the smart move if we have a new target
            if (newTarget && newTarget !== rangerTarget) bot.stopSmartMove()

            rangerTarget = newTarget ? newTarget : "scorpion"
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { await targetLoop() }, 1000)
    }
    targetLoop()

    async function attackLoop() {
        let cooldown = 10
        try {
            if (bot.socket.disconnected) return

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }
            if (bot.character.hp < bot.character.max_hp * 0.25) {
                if (!bot.character.slots.orb || bot.character.slots.orb.name !== "jacko") {
                    const i = bot.locateItem("jacko")
                    if (i) await bot.equip(i)
                }
                if (bot.getCooldown("scare") == 0) {
                    await bot.scare()
                }
                setTimeout(async () => { attackLoop() }, bot.getCooldown("scare"))
                return
            }

            // TODO: Change visibleMonsterTypes to a Map which contains the closest one
            const visibleMonsterTypes: Set<MonsterName> = new Set()
            const inRangeMonsterTypes: Set<MonsterName> = new Set()
            for (const entity of bot.entities.values()) {
                visibleMonsterTypes.add(entity.type)
                if (Tools.distance(bot.character, entity) < bot.character.range) inRangeMonsterTypes.add(entity.type)
            }

            if (rangerTarget) {
                if (strategy[rangerTarget].equipment) {
                    for (const s in strategy[rangerTarget].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[rangerTarget].equipment[slot]
                        const wtype = bot.G.items[itemName].wtype
                        if (bot.G.classes[bot.character.ctype].doublehand[wtype]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.character.slots.offhand) await bot.unequip("offhand")
                        }

                        if (bot.character.slots[slot] && bot.character.slots[slot].name !== itemName) {
                            const i = bot.locateItem(itemName)
                            if (i) await bot.equip(i, slot)
                        }
                    }
                }
            }

            if (rangerTarget && visibleMonsterTypes.has(rangerTarget)) {
                cooldown = await strategy[rangerTarget].attack()
            } else {
                if (bot.getCooldown("attack") == 0) {
                    const targets: string[] = []
                    const threeshotTargets: string[] = []
                    const fiveshotTargets: string[] = []
                    for (const [id, entity] of bot.entities) {
                        if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
                        if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                        if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                        // If the target will die to incoming projectiles, ignore it
                        if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                        // If the target will burn to death, ignore it
                        if (Tools.willBurnToDeath(entity)) continue

                        targets.push(id)

                        // If we can kill enough monsters in one shot, let's try to do that
                        const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                        if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(id)
                        if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(id)
                    }

                    if (fiveshotTargets.length >= 5 && bot.character.mp >= bot.G.skills["5shot"].mp) {
                        await bot.fiveShot(fiveshotTargets[0], fiveshotTargets[1], fiveshotTargets[2], fiveshotTargets[3], fiveshotTargets[4])
                    } else if (threeshotTargets.length >= 3 && bot.character.mp >= bot.G.skills["3shot"].mp) {
                        await bot.threeShot(threeshotTargets[0], threeshotTargets[1], threeshotTargets[2])
                    } else if (targets.length) {
                        // TODO: If we can do more damage with a `piercingshot`, do it.
                        await bot.attack(targets[0])
                    }
                }

                if (bot.getCooldown("supershot") == 0) {
                    const targets: string[] = []
                    for (const [id, entity] of bot.entities) {
                        if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
                        if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                        if (Tools.distance(bot.character, entity) > bot.character.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range

                        // If the target will die to incoming projectiles, ignore it
                        if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                        // If the target will burn to death, ignore it
                        if (Tools.willBurnToDeath(entity)) continue

                        targets.push(id)

                        const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0] * bot.G.skills.supershot.damage_multiplier
                        if (minimumDamage > entity.hp) {
                            // Stop looking for another one to attack, since we can kill this one in one hit.
                            targets[0] = id
                            break
                        }
                    }

                    if (targets.length) {
                        await bot.supershot(targets[0])
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, cooldown)
    }
    attackLoop()

    async function buyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.hasItem("computer")) {
                // Buy HP Pots
                const numHpot1 = bot.countItem("hpot1")
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = bot.countItem("mpot1")
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 60000)
    }
    buyLoop()

    async function healLoop() {
        try {
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
            const hpot1 = bot.locateItem("hpot1")
            const mpot1 = bot.locateItem("mpot1")
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && mpot1) {
                    await bot.useMPPot(mpot1)
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            }
        } catch (e) {
            //console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function lootLoop() {
        try {
            if (bot.socket.disconnected) return

            for (const [id, chest] of bot.chests) {
                if (Tools.distance(bot.character, chest) > 800) continue
                bot.openChest(id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            const sendTo = bot.players.get(merchant.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < 400) {
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item
                        || item.name == "computer"
                        || item.name == "tracker"
                        || item.name == "hpot0"
                        || item.name == "hpot1"
                        || item.name == "mpot0"
                        || item.name == "mpot1"
                        || item.name == "jacko"
                        // Ranger items
                        || item.name == "bow"
                        || item.name == "bowofthedead"
                        || item.name == "crossbow"
                        || item.name == "firebow"
                        || item.name == "hbow"
                        || item.name == "merry"
                        || item.name == "orbg"
                        || item.name == "quiver"
                        || item.name == "t2quiver"
                    ) continue // Don't send important items

                    await bot.sendItem(merchant.character.id, i, item.q)
                }
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(merchant.character.id, extraGold)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()

    async function moveLoop() {
        let cooldown = 10

        try {
            if (bot.socket.disconnected) return

            // Priority #1: Turn in / get Monster Hunt quest
            if (!bot.character.s.monsterhunt) {
                // Move to monsterhunter if there's no MH
                await bot.smartMove("monsterhunter")
                bot.getMonsterHuntQuest()
                setTimeout(async () => { moveLoop() }, 500)
                return
            } else if (bot.character.s.monsterhunt.c == 0) {
                // Move to monsterhunter if we are finished the quest
                await bot.smartMove("monsterhunter")
                // TODO: Implement finishMonsterHuntQuest()
                bot.finishMonsterHuntQuest()
                bot.getMonsterHuntQuest()
                setTimeout(async () => { moveLoop() }, 500)
                return
            }

            // Priority #2: Special monsters

            if (rangerTarget) {
                cooldown = await strategy[rangerTarget].move()
            }

            if (bot.socket.disconnected) return

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, cooldown)
    }
    moveLoop()

    async function partyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!bot.party) {
                bot.sendPartyRequest(merchant.character.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 10000)
    }
    partyLoop()
}

async function startPriest(bot: Priest) {
    const defaultAttackStrategy = async (mtype: MonsterName): Promise<number> => {
        if (bot.getCooldown("attack") == 0) {
            // Heal party members if they are close
            let target: PlayerData
            for (const [id, player] of bot.players) {
                if (![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(id)) continue // Don't heal other players
                if (player.hp > player.max_hp * 0.8) continue // Lots of health, no need to heal
                if (Tools.distance(bot.character, player) > bot.character.range) continue // Too far away to heal

                target = player
                break
            }
            if (target) {
                await bot.heal(target.id)
            }

            if (!target) {
                const targets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== mtype) continue
                    if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    targets.push(entity)

                    const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                    if (minimumDamage > entity.hp) {
                        // Stop looking for another one to attack, since we can kill this one in one hit.
                        targets[0] = entity
                        break
                    }
                }

                if (targets.length) {
                    await bot.attack(targets[0].id)
                    // Remove from other characters if we're going to kill it
                    if (Tools.isGuaranteedKill(bot.character, targets[0])) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(targets[0].id)
                        }
                    }
                }
            }
        }

        return Math.max(10, bot.getCooldown("attack"))
    }
    const tankAttackStrategy = async (mtype: MonsterName, tank: string) => {
        // If we have a target scare it away
        for (const [, entity] of bot.entities) {
            if (entity.target == bot.character.id) {
                await bot.scare()
                return bot.getCooldown("scare") // Don't attack until we have scare available again
            }
        }

        if (bot.getCooldown("attack") == 0) {
            // Heal party members if they are close
            let target: PlayerData
            for (const [id, player] of bot.players) {
                if (![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(id)) continue // Don't heal other players
                if (player.hp > player.max_hp * 0.8) continue // Lots of health, no need to heal
                if (Tools.distance(bot.character, player) > bot.character.range) continue // Too far away to heal

                target = player
                break
            }
            if (target) {
                await bot.heal(target.id)
            }

            if (!target) {
                let target: EntityData
                for (const [, entity] of bot.entities) {
                    if (entity.type !== mtype) continue
                    if (entity.target !== tank) continue // It's not targeting our tank
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    target = entity
                    break
                }

                if (target) {
                    if (bot.getCooldown("curse") == 0 && bot.character.mp > bot.G.skills.curse.mp + bot.character.mp_cost) {
                        bot.curse(target.id)
                    }

                    await bot.attack(target.id)
                    // Remove from other characters if we're going to kill it
                    if (Tools.isGuaranteedKill(bot.character, target)) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(target.id)
                        }
                    }
                }
            }
        }

        return Math.max(10, bot.getCooldown("attack"))
    }
    const holdPositionMoveStrategy = async (position: NodeData) => {
        try {
            if (Tools.distance(bot.character, position) > 0) await bot.smartMove(position)
        } catch (e) {
            // Suppress these errors, we expect a lot.
        }
        return 1000
    }
    const strategy: Strategy = {
        armadillo: {
            attack: async () => { return await defaultAttackStrategy("armadillo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 546, y: 1846 }) }
        },
        bee: {
            attack: async () => { return await defaultAttackStrategy("bee") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 152, y: 1487 }) },
            attackWhileIdle: true
        },
        crab: {
            attack: async () => { return await defaultAttackStrategy("crab") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1182, y: -66 }) },
            attackWhileIdle: true
        },
        croc: {
            attack: async () => { return await defaultAttackStrategy("croc") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 821, y: 1710 }) }
        },
        goo: {
            attack: async () => { return await defaultAttackStrategy("goo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -12, y: 787 }) },
            attackWhileIdle: true
        },
        mummy: {
            attack: async () => { return await tankAttackStrategy("mummy", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 270, y: -1129 }) },
            equipment: { "orb": "jacko" },
            attackWhileIdle: false
        },
        plantoid: {
            attack: async () => { return await tankAttackStrategy("plantoid", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -730, y: -125 }) },
            equipment: { "orb": "jacko" }
        },
        porcupine: {
            attack: async () => { return await defaultAttackStrategy("porcupine") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -809, y: 135 }) },
            attackWhileIdle: true
        },
        pppompom: {
            attack: async () => { return await tankAttackStrategy("mummy", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "level2n", x: 120, y: -150 }) },
            equipment: { "orb": "jacko" }
        },
        scorpion: {
            attack: async () => { return await defaultAttackStrategy("scorpion") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 1598, y: -168 }) },
            attackWhileIdle: true
        },
        squig: {
            attack: async () => { return await defaultAttackStrategy("squig") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1155, y: 422 }) },
            attackWhileIdle: true
        },
        squigtoad: {
            attack: async () => { return await defaultAttackStrategy("squigtoad") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1155, y: 422 }) },
            attackWhileIdle: true
        }
    }

    async function targetLoop(): Promise<void> {
        let newTarget: MonsterName
        try {
            // TODO: Special 

            // Priority #2: Monster Hunts
            if (!newTarget) {
                const monsterHuntTarget = getMonsterHuntTarget(strategy)
                if (monsterHuntTarget) newTarget = monsterHuntTarget
            }

            // Stop the smart move if we have a new target
            if (newTarget && newTarget !== priestTarget) bot.stopSmartMove()

            priestTarget = newTarget ? newTarget : "scorpion"
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { await targetLoop() }, 1000)
    }
    targetLoop()

    async function attackLoop() {
        let cooldown = 10
        try {
            if (bot.socket.disconnected) return

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }
            if (bot.character.hp < bot.character.max_hp * 0.25) {
                if (!bot.character.slots.orb || bot.character.slots.orb.name !== "jacko") {
                    const i = bot.locateItem("jacko")
                    if (i) await bot.equip(i)
                }
                if (bot.getCooldown("scare") == 0) {
                    await bot.scare()
                }
                setTimeout(async () => { attackLoop() }, bot.getCooldown("scare"))
                return
            }

            if (priestTarget) {
                if (strategy[priestTarget].equipment) {
                    for (const s in strategy[priestTarget].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[priestTarget].equipment[slot]
                        const wtype = bot.G.items[itemName].wtype
                        if (bot.G.classes[bot.character.ctype].doublehand[wtype]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.character.slots.offhand) await bot.unequip("offhand")
                        }

                        if (bot.character.slots[slot] && bot.character.slots[slot].name !== itemName) {
                            const i = bot.locateItem(itemName)
                            if (i) await bot.equip(i, slot)
                        }
                    }
                }
            }

            // TODO: Change visibleMonsterTypes to a Map which contains the closest one
            const visibleMonsterTypes: Set<MonsterName> = new Set()
            const inRangeMonsterTypes: Set<MonsterName> = new Set()
            for (const entity of bot.entities.values()) {
                visibleMonsterTypes.add(entity.type)
                if (Tools.distance(bot.character, entity) < bot.character.range) inRangeMonsterTypes.add(entity.type)
            }

            if (priestTarget && visibleMonsterTypes.has(priestTarget)) {
                cooldown = await strategy[priestTarget].attack()
            } else {
                if (bot.getCooldown("attack") == 0) {
                    const targets: string[] = []

                    // Heal party members if they are close
                    for (const [id, player] of bot.players) {
                        if (![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(id)) continue // Don't heal other players
                        if (player.hp > player.max_hp * 0.8) continue // Lots of health, no need to heal
                        if (Tools.distance(bot.character, player) > bot.character.range) continue // Too far away to heal

                        targets.push(id)
                        break
                    }
                    if (targets.length) {
                        await bot.heal(targets[0])
                        cooldown = bot.getCooldown("attack")
                    }

                    if (targets.length == 0) {
                        for (const [id, entity] of bot.entities) {
                            if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
                            if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                            if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                            // If the target will die to incoming projectiles, ignore it
                            if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                            // If the target will burn to death, ignore it
                            if (Tools.willBurnToDeath(entity)) continue

                            targets.push(id)

                            const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                            if (minimumDamage > entity.hp) {
                                // Stop looking for another one to attack, since we can kill this one in one hit.
                                targets[0] = id
                                break
                            }
                        }

                        if (targets.length) {
                            await bot.attack(targets[0])
                            cooldown = bot.getCooldown("attack")
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, cooldown)
    }
    attackLoop()

    async function buyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.hasItem("computer")) {
                // Buy HP Pots
                const numHpot1 = bot.countItem("hpot1")
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = bot.countItem("mpot1")
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 60000)
    }
    buyLoop()

    async function healLoop() {
        try {
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
            const hpot1 = bot.locateItem("hpot1")
            const mpot1 = bot.locateItem("mpot1")
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && mpot1) {
                    await bot.useMPPot(mpot1)
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            }
        } catch (e) {
            //console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function lootLoop() {
        try {
            if (bot.socket.disconnected) return

            for (const [id, chest] of bot.chests) {
                if (Tools.distance(bot.character, chest) > 800) continue
                bot.openChest(id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            const sendTo = bot.players.get(merchant.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < 400) {
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item
                        || item.name == "computer"
                        || item.name == "tracker"
                        || item.name == "hpot0"
                        || item.name == "hpot1"
                        || item.name == "mpot0"
                        || item.name == "mpot1"
                        || item.name == "jacko"
                        // Priest items
                        || item.name == "orbg"
                        || item.name == "shield"
                        || item.name == "wbook1"
                    ) continue // Don't send important items

                    await bot.sendItem(merchant.character.id, i, item.q)
                }
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(merchant.character.id, extraGold)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()

    async function moveLoop() {
        let cooldown = 10

        try {
            if (bot.socket.disconnected) return

            // Priority #1: Turn in / get Monster Hunt quest
            if (!bot.character.s.monsterhunt) {
                // Move to monsterhunter if there's no MH
                await bot.smartMove("monsterhunter")
                bot.getMonsterHuntQuest()
                setTimeout(async () => { moveLoop() }, 500)
                return
            } else if (bot.character.s.monsterhunt.c == 0) {
                // Move to monsterhunter if we are finished the quest
                await bot.smartMove("monsterhunter")
                // TODO: Implement finishMonsterHuntQuest()
                bot.finishMonsterHuntQuest()
                bot.getMonsterHuntQuest()
                setTimeout(async () => { moveLoop() }, 500)
                return
            }

            // Priority #2: Special monsters
            if (priestTarget) {
                cooldown = await strategy[priestTarget].move()
            }

            if (bot.socket.disconnected) return

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, cooldown)
    }
    moveLoop()

    async function partyHealLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.c.town) {
                setTimeout(async () => { partyHealLoop() }, bot.character.c.town.ms)
                return
            }

            if (bot.character.mp >= bot.G.skills.partyheal.mp) {
                for (const bot of [priest, ranger, warrior, merchant]) {
                    if (!bot.party.list.includes(priest.character.id)) continue // Our priest isn't in the party!?
                    if (bot.character.hp < bot.character.max_hp * 0.5) {
                        // Someone in our party has low HP
                        await priest.partyHeal()
                        break
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyHealLoop() }, 250)
    }
    partyHealLoop()

    async function partyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!bot.party) {
                bot.sendPartyRequest(merchant.character.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 10000)
    }
    partyLoop()
}

async function startWarrior(bot: Warrior) {
    const defaultAttackStrategy = async (mtype: MonsterName): Promise<number> => {
        if (bot.getCooldown("attack") == 0) {
            const targets: EntityData[] = []

            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(entity)

                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                if (minimumDamage > entity.hp) {
                    // Stop looking for another one to attack, since we can kill this one in one hit.
                    targets[0] = entity
                    break
                }
            }

            if (targets.length) {
                await bot.attack(targets[0].id)
                // Remove from other characters if we're going to kill it
                if (Tools.isGuaranteedKill(bot.character, targets[0])) {
                    for (const bot of [ranger, priest, warrior, merchant]) {
                        bot.entities.delete(targets[0].id)
                    }
                }
            }
        }

        return Math.max(10, bot.getCooldown("attack"))
    }
    /**
     * If you're using this strategy, make sure you have a `jacko` equipped.
     * @param mtype 
     */
    const oneTargetAttackStrategy = async (mtype: MonsterName) => {
        // If we have more than one target, scare
        let numTargeting = 0
        for (const [, entity] of bot.entities) {
            if (entity.target == bot.character.id) numTargeting += 1
            if (numTargeting > 1) {
                await bot.scare()
                return bot.getCooldown("scare") // Don't attack until we have scare available again
            }
        }

        if (bot.getCooldown("attack") == 0) {
            let target: EntityData

            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                if (entity.target == bot.character.id) {
                    target = entity
                    break // This entity is already targeting us, we should attack it.
                }

                if (!target) {
                    target = entity
                } else if (entity.hp < target.hp) {
                    // Prioritize killing lower hp monsters first
                    target = entity
                }
            }

            if (!target && bot.getCooldown("taunt") == 0) {
                // See if one is in taunt distance
                for (const [, entity] of bot.entities) {
                    if (entity.type !== mtype) continue
                    if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.G.skills.taunt.range) continue // Only taunt those in range

                    if (entity.target == bot.character.id) {
                        target = entity
                        break // This entity is already targeting us, we should attack it.
                    }

                    if (!target) {
                        target = entity
                    } else if (entity.hp < target.hp) {
                        // Prioritize killing lower hp monsters first
                        target = entity
                    }
                }
                if (target && target.target !== bot.character.id) {
                    await bot.taunt(target.id)
                }
            } else if (target) {
                if (bot.G.monsters[target.type].damage_type == "physical" && bot.getCooldown("hardshell") && bot.character.mp > bot.G.skills.hardshell.mp) {
                    await bot.hardshell()
                }
                if (bot.G.items[bot.character.slots.mainhand.name].wtype == bot.G.skills.stomp.wtype && bot.getCooldown("stomp") == 0 && bot.character.mp > bot.G.skills.stomp.mp) {
                    await bot.stomp()
                }
                await bot.attack(target.id)
                // Remove from other characters if we're going to kill it
                if (Tools.isGuaranteedKill(bot.character, target)) {
                    for (const bot of [ranger, priest, warrior, merchant]) {
                        bot.entities.delete(target.id)
                    }
                }
            }
        }

        return Math.max(10, bot.getCooldown("attack"))
    }
    const nearbyMonstersMoveStrategy = async (position: NodeData, mtype: MonsterName) => {
        let closestEntitiy: EntityData
        let closestDistance: number = Number.MAX_VALUE
        for (const [, entity] of bot.entities) {
            if (entity.type !== mtype) continue

            // If the target will die to incoming projectiles, ignore it
            if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

            // If the target will burn to death, ignore it
            if (Tools.willBurnToDeath(entity)) continue

            const distance = Tools.distance(bot.character, position)
            if (distance < closestDistance) {
                closestDistance = distance
                closestEntitiy = entity
            }
        }

        try {
            if (!closestEntitiy && !bot.character.moving) bot.smartMove(position)
            else if (closestEntitiy) bot.smartMove(closestEntitiy)
        } catch (e) {
            // Suppress these errors, we expect a lot.
        }
        return 250
    }
    const holdPositionMoveStrategy = async (position: NodeData) => {
        try {
            if (Tools.distance(bot.character, position) > 0) await bot.smartMove(position)
        } catch (e) {
            // Suppress these errors, we expect a lot.
        }
        return 1000
    }
    const strategy: Strategy = {
        bee: {
            attack: async () => { return await defaultAttackStrategy("bee") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 737, y: 720 }, "bee") },
            equipment: { "mainhand": "bataxe" },
            attackWhileIdle: true
        },
        crab: {
            attack: async () => { return await defaultAttackStrategy("crab") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1222, y: -66 }, "crab") },
            equipment: { "mainhand": "bataxe" },
            attackWhileIdle: true
        },
        croc: {
            attack: async () => { return await defaultAttackStrategy("croc") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 781, y: 1710 }, "croc") }
        },
        goo: {
            attack: async () => { return await defaultAttackStrategy("goo") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -52, y: 787 }, "goo") },
            equipment: { "mainhand": "bataxe" },
            attackWhileIdle: true
        },
        mummy: {
            attack: async () => { return await defaultAttackStrategy("mummy") },
            // TODO: Make abuseRageMoveStrategy
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 230, y: -1129 }) },
            equipment: { "mainhand": "basher", "orb": "jacko" },
            attackWhileIdle: false
        },
        plantoid: {
            attack: async () => { return await oneTargetAttackStrategy("plantoid") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -770, y: -125 }) },
            equipment: { "mainhand": "basher", "orb": "jacko" }
        },
        pppompom: {
            attack: async () => { return oneTargetAttackStrategy("pppompom") },
            move: async () => { return await holdPositionMoveStrategy({ map: "level2n", x: 80, y: -150 }) },
            equipment: { "mainhand": "basher", "orb": "jacko" },
        },
        scorpion: {
            attack: async () => { return await defaultAttackStrategy("scorpion") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 1558, y: -168 }, "scorpion") },
            equipment: { "mainhand": "bataxe" },
            attackWhileIdle: true
        },
        squig: {
            attack: async () => { return await defaultAttackStrategy("squig") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1195, y: 422 }) },
            equipment: { "mainhand": "bataxe" },
            attackWhileIdle: true
        },
        squigtoad: {
            attack: async () => { return await defaultAttackStrategy("squigtoad") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1195, y: 422 }) },
            equipment: { "mainhand": "bataxe" },
            attackWhileIdle: true
        }
    }

    async function targetLoop(): Promise<void> {
        let newTarget: MonsterName
        try {
            if (bot.socket.disconnected) return

            // TODO: Special 

            // Priority #2: Monster Hunts
            if (!newTarget) {
                const monsterHuntTarget = getMonsterHuntTarget(strategy)
                if (monsterHuntTarget) newTarget = monsterHuntTarget
            }

            // Stop the smart move if we have a new target
            if (newTarget && newTarget !== warriorTarget) bot.stopSmartMove()

            warriorTarget = newTarget ? newTarget : "scorpion"
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { await targetLoop() }, 1000)
    }
    targetLoop()

    async function attackLoop() {
        let cooldown = 10
        try {
            if (bot.socket.disconnected) return

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }
            if (bot.character.hp < bot.character.max_hp * 0.25) {
                if (!bot.character.slots.orb || bot.character.slots.orb.name !== "jacko") {
                    const i = bot.locateItem("jacko")
                    if (i) await bot.equip(i)
                }
                if (bot.getCooldown("scare") == 0) {
                    await bot.scare()
                }
                setTimeout(async () => { attackLoop() }, bot.getCooldown("scare"))
                return
            }

            if (warriorTarget) {
                if (strategy[warriorTarget].equipment) {
                    for (const s in strategy[warriorTarget].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[warriorTarget].equipment[slot]
                        const wtype = bot.G.items[itemName].wtype
                        if (bot.G.classes[bot.character.ctype].doublehand[wtype]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.character.slots.offhand) await bot.unequip("offhand")
                        }

                        if (bot.character.slots[slot] && bot.character.slots[slot].name !== itemName) {
                            const i = bot.locateItem(itemName)
                            if (i) await bot.equip(i, slot)
                        }
                    }
                }
            }

            // TODO: Change visibleMonsterTypes to a Map which contains the closest one
            const visibleMonsterTypes: Set<MonsterName> = new Set()
            const inRangeMonsterTypes: Set<MonsterName> = new Set()
            for (const entity of bot.entities.values()) {
                visibleMonsterTypes.add(entity.type)
                if (Tools.distance(bot.character, entity) < bot.character.range) inRangeMonsterTypes.add(entity.type)
            }

            if (warriorTarget && visibleMonsterTypes.has(warriorTarget)) {
                cooldown = await strategy[warriorTarget].attack()
            } else {
                if (bot.getCooldown("attack") == 0) {
                    const targets: string[] = []
                    for (const [id, entity] of bot.entities) {
                        if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
                        if (!entity.cooperative && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                        if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                        // If the target will die to incoming projectiles, ignore it
                        if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                        // If the target will burn to death, ignore it
                        if (Tools.willBurnToDeath(entity)) continue

                        targets.push(id)

                        const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                        if (minimumDamage > entity.hp) {
                            // Stop looking for another one to attack, since we can kill this one in one hit.
                            targets[0] = id
                            break
                        }
                    }

                    if (targets.length) {
                        await bot.attack(targets[0])
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, cooldown)
    }
    attackLoop()

    async function buyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.hasItem("computer")) {
                // Buy HP Pots
                const numHpot1 = bot.countItem("hpot1")
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = bot.countItem("mpot1")
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 60000)
    }
    buyLoop()

    async function chargeLoop() {
        try {
            if (bot.socket.disconnected) return
            await bot.charge()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { chargeLoop() }, bot.getCooldown("charge"))
    }
    chargeLoop()

    async function healLoop() {
        try {
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
            const hpot1 = bot.locateItem("hpot1")
            const mpot1 = bot.locateItem("mpot1")
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && mpot1) {
                    await bot.useMPPot(mpot1)
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            }
        } catch (e) {
            //console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function lootLoop() {
        try {
            if (bot.socket.disconnected) return

            for (const [id, chest] of bot.chests) {
                if (Tools.distance(bot.character, chest) > 800) continue
                bot.openChest(id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            const sendTo = bot.players.get(merchant.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < 400) {
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item
                        || item.name == "computer"
                        || item.name == "tracker"
                        || item.name == "hpot0"
                        || item.name == "hpot1"
                        || item.name == "mpot0"
                        || item.name == "mpot1"
                        || item.name == "jacko"
                        // Warrior items
                        || item.name == "basher"
                        || item.name == "bataxe"
                        || item.name == "candycanesword"
                        || item.name == "carrotsword"
                        || item.name == "fireblade"
                        || item.name == "orbg"
                        || item.name == "shield"
                        || item.name == "sshield"
                        || item.name == "swordofthedead"
                        || item.name == "woodensword"
                    ) continue // Don't send important items

                    await bot.sendItem(merchant.character.id, i, item.q)
                }
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(merchant.character.id, extraGold)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()

    async function moveLoop() {
        let cooldown = 10

        try {
            if (bot.socket.disconnected) return

            // Priority #1: Turn in / get Monster Hunt quest
            if (!bot.character.s.monsterhunt) {
                // Move to monsterhunter if there's no MH
                await bot.smartMove("monsterhunter")
                bot.getMonsterHuntQuest()
                setTimeout(async () => { moveLoop() }, 500)
                return
            } else if (bot.character.s.monsterhunt.c == 0) {
                // Move to monsterhunter if we are finished the quest
                await bot.smartMove("monsterhunter")
                // TODO: Implement finishMonsterHuntQuest()
                bot.finishMonsterHuntQuest()
                bot.getMonsterHuntQuest()
                setTimeout(async () => { moveLoop() }, 500)
                return
            }

            // Priority #2: Special monsters
            if (warriorTarget) {
                cooldown = await strategy[warriorTarget].move()
            }

            if (bot.socket.disconnected) return

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, cooldown)
    }
    moveLoop()

    async function partyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!bot.party) {
                await bot.sendPartyRequest(merchant.character.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 10000)
    }
    partyLoop()

    async function warcryLoop() {
        try {
            if (bot.socket.disconnected) return
            await bot.warcry()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { warcryLoop() }, bot.getCooldown("warcry"))
    }
    warcryLoop()
}

async function startMerchant(bot: Merchant) {
    bot.socket.on("request", (data: { name: string }) => {
        bot.acceptPartyRequest(data.name)
    })

    async function buyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.hasItem("computer")) {
                // Buy HP Pots
                const numHpot1 = bot.countItem("hpot1")
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = bot.countItem("mpot1")
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 60000)
    }
    buyLoop()

    async function healLoop() {
        try {
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
            const hpot1 = bot.locateItem("hpot1")
            const mpot1 = bot.locateItem("mpot1")
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && mpot1) {
                    await bot.useMPPot(mpot1)
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            }
        } catch (e) {
            //console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function lootLoop() {
        try {
            if (bot.socket.disconnected) return

            for (const [id, chest] of bot.chests) {
                if (Tools.distance(bot.character, chest) > 800) continue
                bot.openChest(id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function mluckLoop() {
        try {
            if (bot.socket.disconnected) return

            for (const [, player] of bot.players) {
                if (Tools.distance(bot.character, player) > bot.G.skills.mluck.range) continue // Too far away to mluck

                if (!player.s.mluck) await bot.mluck(player.id) // Give the mluck
                else if (!player.s.mluck.strong && player.s.mluck.f !== bot.character.id) await bot.mluck(player.id) // Steal the mluck
                else if (player.s.mluck.ms < 3.54e+6) await bot.mluck(player.id) // Extend the mluck
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { mluckLoop() }, 250)
    }
    mluckLoop()

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) return

            // TODO: Check if we are full

            // TODO: Check if our players have lots of items

            // TODO: Check if our players need potions

            // TODO: Check if our players need mluck

            // TODO: Check if others need mluck
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function run(region: ServerRegion, identifier: ServerIdentifier) {
    await Promise.all([Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpassword"), Pathfinder.prepare()])

    ranger = await Game.startRanger("earthiverse", region, identifier)
    warrior = await Game.startWarrior("earthWar", region, identifier)
    priest = await Game.startPriest("earthPri", region, identifier)
    merchant = await Game.startMerchant("earthMer", region, identifier)

    // Disconnect if we have to
    ranger.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        Game.disconnect()
    })
    warrior.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        Game.disconnect()
    })
    priest.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        Game.disconnect()
    })
    merchant.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        Game.disconnect()
    })

    // Start the bots!
    startRanger(ranger)
    startWarrior(warrior)
    startPriest(priest)
    startMerchant(merchant)
}
run("ASIA", "I")