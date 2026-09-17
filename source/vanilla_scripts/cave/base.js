/* eslint-disable no-undef */
async function attackLoop() {
    try {
        const target = get_nearest_monster()
        if (target && character.range >= distance(character, target)) {
            await attack(target)
            reduce_cooldown("attack", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(attackLoop, Math.max(100, parent.next_skill["attack"].getTime() - Date.now()))
    }
}
attackLoop()

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
    } finally {
        setTimeout(regenLoop, Math.max(100, parent.next_skill["use_hp"].getTime() - Date.now()))
    }
}
regenLoop()

async function lootLoop() {
    try {
        // The built in loot() does pretty much all of the work for us!
        loot()
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(lootLoop, 250)
    }
}
lootLoop()
