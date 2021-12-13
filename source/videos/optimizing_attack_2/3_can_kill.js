/* eslint-disable no-undef */
load_code("base")

const SCRIPT_NAME = "default"
const MERCHANT = "attackMer"
const CHARACTERS = ["attackMag", "attackMag2", "attackMag3"]
const MONSTER = "bee"

if (!character.controller) {
    for (const friend of CHARACTERS) {
        if (friend == character.id) continue
        start_character(friend, SCRIPT_NAME)
    }

    setTimeout(() => { startStatisticsLoop(SCRIPT_NAME, CHARACTERS) }, 60000)
}

// This function checks if we can kill the entity with a normal attack
function canKill(entity) {
    if (entity["1hp"]) return entity.hp <= 1

    let minimumDamage = this.attack
    switch (G.classes[character.ctype].damage_type) {
        case "magical":
            minimumDamage *= 0.9 * damage_multiplier(entity.resistance - character.rpiercing)
            break
        case "physical":
            minimumDamage *= 0.9 * damage_multiplier(entity.armor - character.apiercing)
            break
    }

    // NOTE: I asked Wizard to add something to G.conditions.cursed and .marked so we don't need these hardcoded.
    if (entity.s.cursed) baseDamage *= 1.2
    if (entity.s.marked) baseDamage *= 1.1

    // Priests only do 40% of their heal in damage
    if (character.ctype == "priest") {
        minimumDamage *= 0.4
    }

    return minimumDamage >= entity.hp
}

// This function "removes" the entity from other characters, so they aren't able to target it.
function removeEntityFromOtherCharacters(entity) {
    for (const friendsParent of getParentsOfCharacters()) {
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
            if (canKill(nearest)) removeEntityFromOtherCharacters(nearest)

            await attack(nearest)
            reduce_cooldown("attack", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { attackLoop() }, Math.max(1, ms_to_next_skill("attack")))
}

if (character.ctype == "merchant") {
    //
} else {
    attackLoop()
    sendStuffLoop(MERCHANT)
}