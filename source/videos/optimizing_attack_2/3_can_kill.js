/* eslint-disable no-undef */
load_code("base")

const SCRIPT_NAME = "can_kill"
const MERCHANT = "attackMer"
const ATTACKING_CHARACTERS = ["attackMag", "attackMag2", "attackMag3"]
const CHARACTERS = [MERCHANT, ...ATTACKING_CHARACTERS]
const MONSTER = "bee"

if (!character.controller) {
    for (const friend of CHARACTERS) {
        if (friend == character.id) continue
        stop_character(friend, SCRIPT_NAME)
        start_character(friend, SCRIPT_NAME)
    }

    setTimeout(() => { startStatisticsLoop(SCRIPT_NAME, CHARACTERS) }, 60000)
}

// This function checks if we can kill the entity with a normal attack
function canKillInOneShot(entity) {
    // Check if it can heal
    if (entity.lifesteal) return false
    if (entity.abilities?.self_healing) return false

    // Check if it can avoid our shot
    if (entity.avoidance) return false
    if (G.classes[character.ctype].damage_type == "magical" && entity.reflection) return false
    if (G.classes[character.ctype].damage_type == "physical" && entity.evasion) return false

    if (entity["1hp"]) return entity.hp <= 1

    // Your damage will randomly fall between 0.9 to 1.1 of your actual attack.
    let minimumDamage = character.attack * 0.9
    switch (G.classes[character.ctype].damage_type) {
        case "magical":
            minimumDamage *= damage_multiplier(entity.resistance - character.rpiercing)
            break
        case "physical":
            minimumDamage *= damage_multiplier(entity.armor - character.apiercing)
            break
    }

    // If the entity is cursed, or marked, they will take more damage
    if (entity.s.cursed) baseDamage *= 1.2
    if (entity.s.marked) baseDamage *= 1.1

    // Priests only do 40% of their heal in damage
    if (character.ctype == "priest") minimumDamage *= 0.4

    return minimumDamage >= entity.hp
}

// This function "removes" the entity from other characters, so they aren't able to target it.
function removeEntityFromOtherCharacters(entity) {
    for (const friendsParent of getParentsOfCharacters(true)) {
        if (friendsParent == top) continue // Don't destroy from the top
        delete friendsParent.entities[entity.id]
    }
}

async function attackLoop() {
    try {
        const nearest = get_nearest_monster({ type: MONSTER })
        if (!nearest) {
            set_message("No Monsters")
        } else if (can_attack(nearest)) {
            set_message("Attacking")

            /**
             * The idea here is that if we can kill the entity, we don't want to
             * waste attacks on our other characters, so we need to do something
             * to prevent them from attacking.
             *
             * This isn't the only way to do it, but it's relatively simple code-wise.
             */
            if (canKillInOneShot(nearest)) removeEntityFromOtherCharacters(nearest)

            await attack(nearest)
            reduce_cooldown("attack", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { attackLoop() }, Math.max(1, ms_to_next_skill("attack")))
}

if (character.ctype == "merchant") {
    buyAndSendPotionsLoop(ATTACKING_CHARACTERS)
} else {
    attackLoop()
    sendStuffLoop(MERCHANT)
}