/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars */
load_code("base")

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