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

// We are replacing `get_nearest_target` with our own function so that we can filter the ignored entities.
function getBestTargets(options = {}) {
    const entities = []

    for (const id in parent.entities) {
        const entity = parent.entities[id]
        if (entity.type !== "monster") continue // It's not a monster, ignore it
        if (entity.dead || !entity.visible) continue // It's dead

        if (parent.IGNORE.includes(id)) continue // It's in our ignore list

        // You can filter entities within a certain range, for example: { "max_range": 100 }
        if (options.max_range && distance(character, entity) > options.max_range) continue

        // You can target a specific monster, for example: { "type": "bee" }
        if (options.type && entity.mtype !== options.type) continue

        // You can target a set of specific monsters, for example: { "types": ["bee", "goo"] }
        if (options.types && !options.types.includes(entity.mtype)) continue

        entities.push(entity)
    }

    // We can prioritize the entities however we want now, whereas before it was only by distance
    entities.sort((a, b) => {
        // Has a target -> higher priority
        if (a.target && !b.target) return -1
        if (b.target && !a.target) return 1

        // Lower HP -> higher priority
        if (a.hp !== b.hp) return a.hp - b.hp

        // Closer -> higher priority
        const d_a = distance(character, a)
        const d_b = distance(character, b)
        if (d_a !== d_b) return d_a - d_b

        return 0
    })

    // We will return all entities, so that this function can be used with skills that target multiple entities in the future
    return entities
}

async function attackLoop() {
    try {
        // We are now using custom logic that includes checking the ignore list
        const best = getBestTargets({ max_range: character.range, type: MONSTER })[0]
        if (!best) {
            set_message("No Monsters")
        } else if (can_attack(best)) {
            set_message("Attacking")

            /**
             * The idea here is that if we can kill the entity, we don't want to
             * waste attacks on our other characters, so we need to do something
             * to prevent them from attacking.
             */
            if (canKillInOneShot(best)) ignoreEntityOnOtherCharacters(best)

            await attack(best)
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