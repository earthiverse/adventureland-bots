/* eslint-disable no-undef */
load_code("base")

const SCRIPT_NAME = "5shot"
const MERCHANT = "attackMer"
const ATTACKING_CHARACTERS = ["attackMag", "attackMag2", "attacking"]
const CHARACTERS = [MERCHANT, ...ATTACKING_CHARACTERS]
const MONSTER = "bee"

const CBURST_WHEN_MAX_MP_WITHIN = 500
const CBURST_WHEN_ENTITY_HP_LESS_THAN = 200
const MP_TO_RESERVE = 500

if (character.ctype == "merchant") {
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

        if (options.max_hp && entity.hp > options.max_hp) continue

        if (options.max_range && distance(character, entity) > options.max_range) continue
        if (options.type && entity.mtype !== options.type) continue
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

let attackLoop = undefined
if (character.ctype == "mage") {
    attackLoop = async () => {
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

                // We won't energize the mages anymore, we'll only energize the ranger because the ranger
                // will use a lot of high mp skills now, and we can use the mages as MP batteries.

                await attack(best)
                reduce_cooldown("attack", Math.min(...parent.pings))
            }

            if (canUse("cburst") && character.mp > (MP_TO_RESERVE + G.skills.cburst.mp)) {
                let targets = getBestTargets({ max_hp: CBURST_WHEN_ENTITY_HP_LESS_THAN, max_range: character.range, type: MONSTER })
                if (targets.length == 0 && character.mp >= (character.max_mp - CBURST_WHEN_MAX_MP_WITHIN)) {
                    targets = getBestTargets({ max_range: character.range, type: MONSTER })
                }
                if (targets.length) {
                    const cbursts = []
                    let remaining_mp = character.mp - MP_TO_RESERVE - G.skills.cburst.mp
                    for (const target of targets) {
                        if (remaining_mp <= 0) break

                        const mpRequiredToKill = Math.ceil(1.1 * target.hp / G.skills.cburst.ratio)
                        const mpToUse = Math.min(remaining_mp, mpRequiredToKill)

                        if (mpToUse == mpRequiredToKill) {
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
} if (character.ctype == "ranger") {
    attackLoop = async () => {
        const minPing = Math.min(...parent.pings)
        try {
            const targets = getBestTargets({ max_range: character.range, type: MONSTER })
            if (targets.length == 0) {
                set_message("No Monsters")
                setTimeout(async () => { attackLoop() }, Math.max(1, ms_to_next_skill("attack")))
                return
            }
            const threeShotTargets = []
            const fiveShotTargets = []
            for (const target of targets) {
                if (target.target) {
                    // It's already targeting one of our characters, attack it with whatever
                    threeShotTargets.push(target)
                    fiveShotTargets.push(target)
                    continue
                }
                if (canKillInOneShot(target, "5shot")) {
                    // We can kill it with 5shot, which means we can also kill it with 3shot
                    threeShotTargets.push(target)
                    fiveShotTargets.push(target)
                    continue
                }
                if (canKillInOneShot(target, "3shot")) {
                    // We can kill it with 3shot
                    threeShotTargets.push(target)
                }
            }

            // Trim the 5shot and 3shot arrays
            fiveShotTargets.splice(5)
            threeShotTargets.splice(3)

            if (canUse("5shot") && fiveShotTargets.length >= 5) {
                set_message("5shotting")

                for (const target of fiveShotTargets) if (canKillInOneShot(target, "5shot")) ignoreEntityOnOtherCharacters(target)

                // Only energize up to what we can't regen with a potion
                if (character.mp < 500) getEnergizeFromFriend(Math.max(1, character.max_mp - character.mp))

                // use_skill isn't await-able yet, so we will await a failed attack to calculate the ping compensation
                // it shouldn't cause too much extra code cost
                await use_skill("5shot", fiveShotTargets.reduce((ids, target) => [...ids, target.id], []))
                await attack(fiveShotTargets[0])
                reduce_cooldown("attack", minPing)
            } else if (canUse("3shot") && threeShotTargets.length >= 3) {
                set_message("3shotting")

                for (const target of threeShotTargets) {
                    if (canKillInOneShot(target, "5shot")) ignoreEntityOnOtherCharacters(target)
                }

                if (character.mp < 500) getEnergizeFromFriend(Math.max(1, character.max_mp - character.mp))

                // use_skill isn't await-able yet, so we will await a failed attack to calculate the ping compensation
                // it shouldn't cause too much extra code cost
                await use_skill("3shot", threeShotTargets.reduce((ids, target) => [...ids, target.id], []))
                await attack(threeShotTargets[0])
                reduce_cooldown("attack", minPing)
            } else if (canUse("attack")) {
                const target = targets[0]

                set_message("Attacking")

                if (canKillInOneShot(target)) ignoreEntityOnOtherCharacters(target)

                if (character.mp < 500) getEnergizeFromFriend(Math.max(1, character.max_mp - character.mp))

                await attack(target)
                reduce_cooldown("attack", minPing)
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { attackLoop() }, Math.max(1, Math.min(ms_to_next_skill("attack"))))
    }
}

if (character.ctype == "merchant") {
    buyAndSendPotionsLoop(ATTACKING_CHARACTERS)
} else {
    attackLoop()
    sendStuffLoop(MERCHANT)
}