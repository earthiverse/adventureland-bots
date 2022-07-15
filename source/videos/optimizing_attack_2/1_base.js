/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

const fs = require("fs")

if (!parent.paused) pause()

/******************************************************************************
 * The following code is used in `default` and later scripts
 *****************************************************************************/

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function ms_to_next_skill(skill) {
    const next_skill = parent.next_skill[skill]
    if (next_skill == undefined) return 0
    const ms = parent.next_skill[skill].getTime() - Date.now()
    return ms < 0 ? 0 : ms
}

function getCharacters(excludeSelf = true) {
    const characters = []

    for (const iframe of top.$("iframe")) {
        const char = iframe.contentWindow.character
        if (!char) continue // Character isn't loaded yet
        if (excludeSelf && char.name == character.name) continue
        characters.push(char)
    }

    return characters
}
function getCharacter(name) {
    for (const iframe of top.$("iframe")) {
        const char = iframe.contentWindow.character
        if (!char) continue // Character isn't loaded yet
        if (char.name == name) return char
    }
}
function getParentsOfCharacters(excludeSelf = true) {
    const parents = []
    for (const iframe of top.$("iframe")) {
        const char = iframe.contentWindow.character
        if (!char) continue // Character isn't loaded yet
        if (excludeSelf && char.name == character.name) continue
        if (!char.controller) {
            parents.push(top)
        } else {
            parents.push(iframe.contentWindow)
        }
    }

    return parents
}
function getParentOfCharacter(name) {
    for (const iframe of top.$("iframe")) {
        const char = iframe.contentWindow.character
        if (!char) continue // Character isn't loaded yet
        if (char.name == name) {
            if (!char.controller) return top
            else return iframe.contentWindow
        }
    }
}

async function partyLoop() {
    try {
        if (!character.party) {
            // We are not in a party

            if (character.controller) {
                // We are running in an iframe, send a party request to the controller
                send_party_request(character.controller)
            }
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(partyLoop, 10000)
}
if (character.controller) partyLoop()

async function lootLoop() {
    try {
        const parents = getParentsOfCharacters(true)
        for (const id in parent.chests) {
            // Don't open far away chests
            const chest = parent.chests[id]
            if (distance(character, chest) > 800) continue

            // Remove the chests from the others to lower call code cost opening already opened chests
            for (const friendsParent of parents) {
                if (friendsParent == top) continue // Don't delete from top
                delete friendsParent.chests[id]
            }

            parent.socket.emit("open_chest", { id: id })
            break
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(lootLoop, 100)
}
if (character.controller) lootLoop()

function filterPartyRequests(name) {
    for (const c of parent.X.characters) {
        if (c.name == name) {
            // It's one of our characters
            accept_party_request(name)
            return
        }
    }

    // NOTE: If you want to let other players' characters join your party, add code here.

    // It's not one of our characters
    game_log(`Ignoring ${name}'s party request.`)
}
if (!character.controller) on_party_request = filterPartyRequests

const TEN_MINUTES_MS = 10 * 60 * 1000
const getSum = arr => arr.reduce((p, c) => p + c, 0)
const getAverage = arr => getSum(arr) / arr.length

const STATS_FOLDER = "C:\\Users\\Hyprk\\Desktop\\stats\\"
/**
 * Shows statistics every 10 minutes
 * @param {*} scriptName Name of the script, so we can keep track
 * @param {*} characters List of characters to track
 */
function startStatisticsLoop(scriptName, characters) {
    // Setup kills object
    const kills = {}
    for (const char of characters) kills[char] = {}

    game.on("hit", (data) => {
        const player = data.actor
        const skill = data.source

        if (!data.kill) return // Not a kill
        if (!characters.includes(player)) return // Not us

        // Add kill to kills object
        const charKills = kills[player]
        if (!charKills[skill]) charKills[skill] = 1
        else charKills[skill] += 1
    })
    const statisticsLoop = function () {
        try {
            const statistics = {
                script: scriptName,
                server: {
                    region: server.region,
                    id: server.id
                },
                characters: [],
                totalKills: 0
            }
            for (const id in kills) {
                const char = getCharacter(id)
                const charP = getParentOfCharacter(id)

                // Add all kills to totalKills
                for (const skill in kills[id]) {
                    statistics.totalKills += kills[id][skill]
                }

                const minPing = Math.min(...charP.pings)
                const maxPing = Math.max(...charP.pings)
                const avgPing = getAverage(charP.pings)

                const charStatistics = {
                    name: id,
                    kills: kills[id],
                    ping: {
                        min: minPing,
                        max: maxPing,
                        avg: avgPing
                    },
                    level: char.level,
                    xp: 100 * char.xp / char.max_xp
                }

                statistics.characters.push(charStatistics)
            }

            const folderExists = fs.existsSync(STATS_FOLDER)
            if (statistics.totalKills > 0 && folderExists) {
                const file = `${STATS_FOLDER}${scriptName}_${Date.now()}.json`
                game_log(`Writing statistics to ${file}...`)
                fs.writeFileSync(file, JSON.stringify(statistics))
            } else if (!folderExists) {
                show_json(statistics)
            }

            // Reset kills to 0
            for (const id in kills) {
                for (const skill in kills[id]) {
                    kills[id][skill] = 0
                }
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(() => { statisticsLoop() }, TEN_MINUTES_MS)
    }
    statisticsLoop()
}

const MPOT0_RECOVERY = G.items.mpot0.gives[0][1]
const MPOT1_RECOVERY = G.items.mpot1.gives[0][1]
const HPOT0_RECOVERY = G.items.hpot0.gives[0][1]
const HPOT1_RECOVERY = G.items.hpot1.gives[0][1]
async function regenLoop() {
    try {
        const hpRatio = character.hp / character.max_hp
        const hpMissing = character.max_hp - character.hp
        const mpRatio = character.mp / character.max_mp
        const mpMissing = character.max_mp - character.mp
        const minPing = Math.min(...parent.pings)

        if (character.rip) {
            // Don't heal if we're dead
            setTimeout(regenLoop, Math.max(100, ms_to_next_skill("use_hp")))
            return
        }

        if (mpRatio < hpRatio) {
            // We want to regen MP
            const mpot0 = locate_item("mpot0")
            const mpot1 = locate_item("mpot1")

            if (mpot1 !== -1 && mpMissing >= MPOT1_RECOVERY) {
                await equip(mpot1)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else if (mpot0 !== -1 && mpMissing >= MPOT0_RECOVERY) {
                await equip(mpot0)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else {
                await use_skill("regen_mp")
                // Use Skill doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            }
        } else if (character.hp !== character.max_hp) {
            // We want to regen HP
            const hpot0 = locate_item("hpot0")
            const hpot1 = locate_item("hpot1")

            if (hpot1 !== -1 && hpMissing >= HPOT1_RECOVERY) {
                await equip(hpot1)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else if (hpot0 !== -1 && hpMissing >= HPOT0_RECOVERY) {
                await equip(hpot0)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else {
                await use_skill("regen_hp")
                // Use Skill doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            }
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(regenLoop, Math.max(100, ms_to_next_skill("use_hp")))
}
regenLoop()

const POTIONS_TO_HOLD = {
    "hpot1": 2500,
    "mpot1": 2500
}
const SEND_POTIONS_AT_RATIO = 0.9 // We will send potions if they drop below (POTIONS_TO_HOLD[itemName] * REPLENISH_AT_RATIO) quantity for the given item.
async function buyAndSendPotionsLoop(names) {
    try {
        // If we don't have a computer don't buy and send potions.
        const hasComputer = locate_item("computer") !== -1
        if (!hasComputer) return

        // Check all friends
        for (const friend of getCharacters(true)) {
            if (distance(character, friend) > 400) continue // Friend is too far away

            const potionsToSend = { ...POTIONS_TO_HOLD }

            for (let i = 0; i < friend.isize; i++) {
                const item = friend.items[i]
                if (!item) continue // No item in this slot
                if (!potionsToSend[item.name]) continue // Not interested in this item
                potionsToSend[item.name] -= item.q // We found some in our inventory, don't buy as many
            }

            for (const itemName in potionsToSend) {
                const qToHold = POTIONS_TO_HOLD[itemName]
                const qToSend = potionsToSend[itemName]

                if (qToSend < (qToHold * (1 - SEND_POTIONS_AT_RATIO))) continue // They have enough to not trigger sending more

                const ourQ = quantity(itemName)
                const qToBuy = qToHold + qToSend - ourQ
                if (qToBuy > 0) await buy(itemName, qToBuy)
                await send_item(friend.id, locate_item(itemName), qToSend)
            }
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { buyAndSendPotionsLoop(names) }, 1000)
}

const GOLD_TO_HOLD = 1_000_000
const SEND_GOLD_AT_RATIO = 1.1 // We will send gold when we reach (GOLD_TO_HOLD * SEND_GOLD_AT_RATIO) gold.
async function sendStuffLoop(name) {
    try {
        const friendSendTo = getCharacter(name)
        const sendTo = parent.entities[name]
        if (sendTo && distance(character, sendTo) < 400) {
            for (let i = 0; i < character.isize; i++) {
                const item = character.items[i]
                if (!item) continue // No item
                if (item.l) continue // Don't send locked items
                if (["hpot1", "mpot1", "tracker", "computer"].includes(item.name)) continue // Don't send important items

                if (friendSendTo) {
                    // We're controlling the character to send to
                    if (friendSendTo.esize == 0) continue // They don't have free space
                }

                await send_item(name, i, item.q ?? 1)
            }

            if (character.gold > (GOLD_TO_HOLD * SEND_GOLD_AT_RATIO)) await send_gold(sendTo, character.gold - GOLD_TO_HOLD)
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { sendStuffLoop(name) }, 1000)
}

/******************************************************************************
 * The following code is used in `can_kill` and later scripts
 *****************************************************************************/

function calculateDamageRange(entity, skill = "attack") {
    const gSkill = G.skills[skill]
    if (!gSkill) console.debug(`calculateDamageRange DEBUG: '${skill}' isn't a skill!?`)

    // If the entity is immune, most skills won't do damage
    if (entity.immune && skill !== "attack" && !gSkill?.pierces_immunity) return [0, 0]

    if (entity["1hp"] || skill == "taunt") {
        if (character.crit) {
            return [1, 2]
        } else {
            return [1, 1]
        }
    }

    let baseDamage = character.attack
    if (gSkill?.damage) baseDamage = gSkill.damage

    // NOTE: I asked Wizard to add something to G.conditions.cursed and .marked so we don't need these hardcoded.
    if (entity.s.cursed) baseDamage *= 1.2
    if (entity.s.marked) baseDamage *= 1.1

    if (character.ctype == "priest") baseDamage *= 0.4 // Priests only do 40% damage

    const damage_type = gSkill?.damage_type ?? G.classes[character.ctype].damage_type

    let additionalApiercing = 0
    if (gSkill?.apiercing) additionalApiercing = gSkill.apiercing
    // NOTE: currently no skills with rpiercing
    // let additionalRpiercing = 0
    // if (gSkill?.rpiercing) additionalRpiercing = gSkill.rpiercing
    if (damage_type == "physical") baseDamage *= damage_multiplier(entity.armor - character.apiercing - additionalApiercing)
    else if (damage_type == "magical") baseDamage *= damage_multiplier(entity.resistance - character.rpiercing /** - additionalRpiercing */)

    if (gSkill?.damage_multiplier) baseDamage *= gSkill.damage_multiplier

    let lowerLimit = baseDamage * 0.9
    let upperLimit = baseDamage * 1.1

    if (character.crit) {
        if (character.crit >= 100) {
            lowerLimit *= (2 + (character.critdamage / 100))
        }
        upperLimit *= (2 + (character.critdamage / 100))
    }

    // NOTE: This information is from @Wizard on Discord on May 1st, 2020
    // https://discord.com/channels/238332476743745536/243707345887166465/705722706250694737
    if (skill == "cleave") {
        lowerLimit *= 0.1
        upperLimit *= 0.9
    }

    return [lowerLimit, upperLimit]
}

// This function checks if we can kill the entity with a normal attack
function canKillInOneShot(entity, skill = "attack") {
    // Check if it can heal
    if (entity.lifesteal) return false
    if (entity.abilities?.self_healing) return false

    const damage_type = G.skills[skill].damage_type ?? G.classes[character.ctype].damage_type

    // Check if it can avoid our shot
    // TODO: `entity.avoidance` isn't set currently, but it *should* be.
    //       If it gets added in the future, you can simplify the if to be `if(entity.avoidance)`.
    if (G.monsters[entity.mtype].avoidance) return false
    if (damage_type == "magical" && entity.reflection) return false
    if (damage_type == "physical" && entity.evasion) return false

    return calculateDamageRange(entity, skill)[0] >= entity.hp
}

/**
 * I give each character its own ignore list. Characters never add entities to their own ignore lists
 * in case something goes wrong and they don't kill the entity.
 */
parent.IGNORE = []
function ignoreEntityOnOtherCharacters(entity) {
    for (const friendsParent of getParentsOfCharacters(true)) {
        if (!friendsParent.IGNORE) return // Doesn't have an ignore list
        if (friendsParent.IGNORE.includes(entity.id)) return // Already in ignore list
        friendsParent.IGNORE.unshift(entity.id) // Add entity to ignore list
        friendsParent.IGNORE.slice(0, 20) // Keep ignore list to a maximum of 20 entities
    }
}

/******************************************************************************
 * The following code is used in `energize` and later scripts
 *****************************************************************************/

/**
 * Returns true if we can use the skill.
 * This function checks various requirements, such as level, having a required item equipped, etc.
 * If you only want to check the cooldown, use isOnCooldown(skill) or getCooldown(skill).
 *
 * @param {SkillName} skill
 * @param {{
 *         ignoreCooldown?: boolean,
 *         ignoreEquipped?: boolean
 *     }} [options]
 * @return {*}  {boolean}
 * @memberof Character
 */
function canUse(skill, options = {}) {
    if (character.rip) return false // We are dead
    for (const conditionName in character.s) {
        const gCondition = G.conditions[conditionName]
        if (gCondition?.blocked) return false // We have a condition that prevents us from using skills
    }
    if (is_on_cooldown(skill) && !options.ignoreCooldown) return false // Skill is on cooldown
    const gInfoSkill = G.skills[skill]
    if (gInfoSkill.hostile && G.maps[character.map].safe) return false // Can't use a hostile skill in a safe place
    if (gInfoSkill.mp !== undefined && character.mp < gInfoSkill.mp) return false // Not enough MP
    if (skill == "attack" && character.mp < character.mp_cost) return false // Not enough MP (attack)
    if (gInfoSkill.level !== undefined && character.level < gInfoSkill.level) return false // Not a high enough level
    if (gInfoSkill.wtype && !options.ignoreEquipped) {
        // The skill requires a certain weapon type
        if (!character.slots.mainhand) return false // We don't have any weapon equipped
        const gInfoWeapon = G.items[character.slots.mainhand.name]
        if (typeof gInfoSkill.wtype == "object") {
            // There's a list of acceptable weapon types
            let isAcceptableWeapon = false
            for (const wtype of gInfoSkill.wtype) {
                if (gInfoWeapon.wtype == wtype) {
                    isAcceptableWeapon = true
                    break
                }
            }
            if (!isAcceptableWeapon)
                return false
        } else {
            // There's only one acceptable weapon type
            if (gInfoWeapon.wtype !== gInfoSkill.wtype)
                return false // We don't have the right weapon type equipped
        }
    }
    if (gInfoSkill.consume && !options.ignoreEquipped) {
        if (locate_item(gInfoSkill.consume) == -1) return false // We don't have the required consumable
    }
    if (gInfoSkill.inventory && !options.ignoreEquipped) {
        for (const item of gInfoSkill.inventory) {
            if (locate_item(item) == -1) return false // We don't have the required item in our inventory
        }
    }
    if (gInfoSkill.slot && !options.ignoreEquipped) {
        // The skill requires an item to be equipped
        let hasSlot = false
        for (const [slot, item] of gInfoSkill.slot) {
            if (character.slots[slot] && character.slots[slot].name == item) {
                // We have it equipped
                hasSlot = true
                break
            }
        }
        if (!hasSlot) return false // We don't have anything equipped that lets us use this skill
    }
    if (gInfoSkill.class) {
        // The skill is only available to certain classes
        let compatibleClass = false
        for (const c of gInfoSkill.class) {
            if (c == character.ctype) {
                compatibleClass = true // We are compatible!
                break
            }
        }
        if (!compatibleClass) return false
    }
    if (gInfoSkill.requirements) {
        // This skill has stat requirements
        for (const stat in gInfoSkill.requirements) {
            if (this[stat] < gInfoSkill.requirements[stat]) return false
        }
    }

    // Special circumstance -- we can't use blink if we're being dampened
    if (character.s.dampened) {
        if (skill == "blink") return false
    }

    // Special circumstance -- merchants can't attack unless they have a dartgun
    if (character.ctype == "merchant" && skill == "attack") {
        if (!character.slots.mainhand) return false // No weapon
        if (character.slots.mainhand.name !== "dartgun") return false // Wrong weapon
        if (character.gold < 100) return false // Not enough gold to shoot
    }

    return true
}
// Overwrite the can_use function with our new & improved one
parent.can_use = canUse

/**
 * This function will check if there is a mage we are controlling nearby that can use energize.
 * If it can, we will use energize on that mage.
 * Call this function immediately before attacking an entity, and it will reduce the cooldown of the attack
 * enabling us to attack a little bit quicker
 */
function getEnergizeFromFriend(amount = 1) {
    if (character.s.energized) return // We are already energized

    for (const friendP of getParentsOfCharacters(true)) {
        const friend = friendP.character
        if (!friendP.can_use("energize")) continue // We can't use energize for whatever reason
        if (distance(friend, character) > G.skills.energize.range) continue // We are too far away from our friend

        // Let's request an energize from our friend!
        friendP.use_skill("energize", character.id, Math.max(1, Math.min(friend.mp, amount)))
        break
    }
}

/******************************************************************************
 * TODO: FUTURE SCRIPTS
 *****************************************************************************/

const PROJECTILES = new Map()
const PROJECTILES_STALE_MS = 5000
game.on("action", (data) => {
    // A projectile was fired, add it to our map
    data.date = Date.now()
    PROJECTILES.set(data.pid, data)
})
game.on("hit", (data) => {
    // A projectile landed, remove it from our map
    PROJECTILES.delete(data.pid)

    // clean old projectiles (they might have went off-screen)
    for (const [pid, old] of PROJECTILES) {
        if (Date.now() - old.date > PROJECTILES_STALE_MS) {
            PROJECTILES.delete(pid)
        }
    }
})

function isTargetedByEnemyProjectile(entity) {
    for (const [, projectile] of PROJECTILES) {
        if (projectile.target !== entity.id) continue // Projectile isn't targeting the entity

        if (character.party && !parent.party_list.includes(projectile.actor)) {
            // It's not a party member's projectile
            return true
        } else if (projectile.actor !== character.id) {
            // It's not our projectile
            return true
        }
    }
    return false
}

function willDieToProjectiles(entity) {
    if (entity.avoidance) return false
    let incomingProjectileDamage = 0
    for (const [, projectile] of PROJECTILES) {
        if (!projectile.damage) continue // This projectile won't do damage
        if (projectile.target !== entity.id) continue

        // NOTE: Entities can attack themselves if the projectile gets reflected
        let attacker = undefined
        if (!attacker && character.id == projectile.actor) attacker = character
        if (!attacker) attacker = parent.entities[projectile.actor]
        if (!attacker) continue // Couldn't find attacker, assume it will do no damage

        // NOTE: We have to add damage_type ourselves manually for players. It's set for monsters.
        //       I asked Wizard to add it to players in #feedback on Discord. Maybe one day...
        if (attacker.ctype) attacker.damage_type = G.classes[attacker.ctype].damage_type

        if (attacker.damage_type == "magical" && entity.reflection) continue // Entity could reflect the damage
        if (attacker.damage_type == "physical" && entity.evasion) continue // Entity could avoid the damage

        const minimumDamage = calculateDamageRange(attacker, entity, projectile.source)[0]

        incomingProjectileDamage += minimumDamage
        if (incomingProjectileDamage >= entity.hp) return true
    }
    return false
}

function willBurnToDeath(entity) {
    if (entity["1hp"]) return false // TODO: Improve to check if it will die to 1hp burns
    if (entity.lifesteal) return false // Could heal itself
    if (entity.abilities?.self_healing) return false // Could heal itself
    if (!entity.s.burned) return false // Not burning

    const burnTime = Math.max(0, (entity.s.burned.ms - (G.conditions.burned.interval * 2))) / 1000
    const burnDamage = burnTime * entity.s.burned.intensity

    return burnDamage > entity.hp
}