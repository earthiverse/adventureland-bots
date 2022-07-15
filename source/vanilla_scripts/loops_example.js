/* eslint-disable no-undef */
/**
 * This script is meant to be an example of how I construct and manage loops.
 * Each loop serves a different function, and is not relied upon by other loops.
 */
const attackThisType = "goo"
async function attackLoop() {
    try {
        const target = get_nearest_monster({ path_check: true, type: attackThisType })
        if (target && character.range >= distance(character, target)) {
            // Awaiting the attack lets us setTimeout right before the next attack is ready to maximize DPS.
            await attack(target)

            // `reduce_cooldown` is used to compensate for ping between the client and server. Utilizing it increases DPS.
            // However, if you reduce_cooldown too much, you may miss an attack.
            reduce_cooldown("attack", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(attackLoop, Math.max(100, parent.next_skill["attack"].getTime() - Date.now()))
}
attackLoop()

async function moveLoop() {
    try {
        // NOTE: If you want to move around the map, for example to refill potions,
        // you should modify this function.

        const target = get_nearest_monster({ path_check: true, type: attackThisType })
        if (!target) {
            // We're not near any targets, let's move to them
            await smart_move(attackThisType)
        } else if (character.range < distance(character, target)) {
            // We are out of range to attack the target, so let's move closer
            move(character.x + (target.x - character.x) / 2, character.y + (target.y - character.y) / 2)
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(moveLoop, 250)
}
moveLoop()

async function regenLoop() {
    try {
        const hp_ratio = character.hp / character.max_hp
        const mp_ratio = character.mp / character.max_mp

        // NOTE: If you want to use potions, modify this function,
        // because potions share a cooldown with regen_hp and regen_mp

        if (mp_ratio < hp_ratio && can_use("regen_mp")) {
            // We have less MP than HP, so let's regen some MP.
            await use_skill("regen_mp")
            reduce_cooldown("regen_mp", Math.min(...parent.pings))
        } else if (can_use("regen_hp")) {
            // We have less HP than MP, so let's regen some HP.
            await use_skill("regen_hp")
            reduce_cooldown("regen_hp", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(regenLoop, Math.max(100, parent.next_skill["use_hp"].getTime() - Date.now()))
}
regenLoop()

async function lootLoop() {
    try {
        // The built in loot() does pretty much all of the work for us!
        loot()
    } catch (e) {
        console.error(e)
    }
    setTimeout(lootLoop, 250)
}
lootLoop()