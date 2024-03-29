/* eslint-disable no-undef */
load_code("base")

const SCRIPT_NAME = "energize"
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

function getBestTargets(options = {}) {
    const entities = []

    for (const id in parent.entities) {
        const entity = parent.entities[id]
        if (entity.type !== "monster") continue
        if (entity.dead || !entity.visible) continue

        if (parent.IGNORE.includes(id)) continue

        if (options.max_range && distance(character, entity) > options.max_range) continue
        if (options.type && entity.mtype !== options.type) continue
        if (options.types && !options.types.includes(entity.mtype)) continue

        entities.push(entity)
    }

    entities.sort((a, b) => {
        if (a.target && !b.target) return -1
        if (b.target && !a.target) return 1

        if (a.hp !== b.hp) return a.hp - b.hp

        const d_a = distance(character, a)
        const d_b = distance(character, b)
        if (d_a !== d_b) return d_a - d_b

        return 0
    })

    return entities
}

async function attackLoop() {
    try {
        const best = getBestTargets({ max_range: character.range, type: MONSTER })[0]
        if (!best) {
            set_message("No Monsters")
        } else if (can_attack(best)) {
            set_message("Attacking")

            if (canKillInOneShot(best)) ignoreEntityOnOtherCharacters(best)

            /** Let's use our other characters to energize each other */
            getEnergizeFromFriend()

            await attack(best)
            reduce_cooldown("attack", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(attackLoop, Math.max(1, ms_to_next_skill("attack")))
    }
}

if (character.ctype == "merchant") {
    buyAndSendPotionsLoop(ATTACKING_CHARACTERS)
} else {
    attackLoop()
    sendStuffLoop(MERCHANT)
}