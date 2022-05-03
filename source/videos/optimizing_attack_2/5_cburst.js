/* eslint-disable no-undef */
load_code("base")

const SCRIPT_NAME = "cburst"
const MERCHANT = "attackMer"
const ATTACKING_CHARACTERS = ["attackMag", "attackMag2", "attackMag3"]
const CHARACTERS = [MERCHANT, ...ATTACKING_CHARACTERS]
const MONSTER = "bee"

const CBURST_WHEN_MAX_MP_WITHIN = 500
const CBURST_WHEN_ENTITY_HP_LESS_THAN = 200
const MP_TO_RESERVE = 500

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

        // You can filter to only get entities under a certain amount of hp, for example: { "max_hp": 200 }
        if (options.max_hp && entity.hp > options.max_hp) continue

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
            setTimeout(async () => { attackLoop() }, Math.max(1, ms_to_next_skill("attack")))
            return
        }

        if (canUse("attack")) {
            set_message("Attacking")

            if (canKillInOneShot(best)) ignoreEntityOnOtherCharacters(best)

            getEnergizeFromFriend()

            await attack(best)
            reduce_cooldown("attack", Math.min(...parent.pings))
        }

        // Let's see if we can cburst anything
        if (canUse("cburst") && character.mp > (MP_TO_RESERVE + G.skills.cburst.mp)) {
            let targets = getBestTargets({ max_hp: CBURST_WHEN_ENTITY_HP_LESS_THAN, max_range: character.range, type: MONSTER })
            if (targets.length == 0 && character.mp >= (character.max_mp - CBURST_WHEN_MAX_MP_WITHIN)) {
                // There aren't any low hp targets, but we're high mp, so we'll look for any monster to burst
                targets = getBestTargets({ max_range: character.range, type: MONSTER })
            }
            if (targets.length) {
                const cbursts = []
                let remaining_mp = character.mp - MP_TO_RESERVE - G.skills.cburst.mp
                for (const target of targets) {
                    if (remaining_mp <= 0) break // We hit our reserve MP

                    // cburst is a pure damage skill, and damage is randomly between 0.9 to 1.1
                    const mpRequiredToKill = Math.ceil(1.1 * target.hp / G.skills.cburst.ratio)
                    const mpToUse = Math.min(remaining_mp, mpRequiredToKill)

                    if (mpToUse == mpRequiredToKill) {
                        // We're going to kill it with cburst, don't attack it with our other characters
                        ignoreEntityOnOtherCharacters(target)
                    }

                    cbursts.push([target.id, mpToUse])
                    remaining_mp -= mpToUse
                }

                use_skill("cburst", cbursts)
                parent.next_skill["cburst"] = new Date(Date.now() + G.skills.cburst.cooldown)
            }
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { attackLoop() }, Math.max(1, Math.min(ms_to_next_skill("attack"), ms_to_next_skill("cburst"))))
}

if (character.ctype == "merchant") {
    buyAndSendPotionsLoop(ATTACKING_CHARACTERS)
} else {
    attackLoop()
    sendStuffLoop(MERCHANT)
}