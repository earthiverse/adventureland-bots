/* eslint-disable no-undef */
load_code("base")

const TenMinutesInMs = 10 * 60 * 1000
let started
let numKilled = 0
let numCalls = 0
character.on("target_hit", (data) => { if (data.kill) numKilled += 1 })

/** NOTE: This is a bad idea, and eslint tells us that, but we're going to ignore the warnings */
// eslint-disable-next-line no-constant-condition
while (true) {
    /** NOTE: We added a try/catch, so the loop continues to run */
    try {
        numCalls += 1
        if (started == undefined) started = Date.now()
        if (Date.now() > started + TenMinutesInMs) {
            show_json(`We killed ${numKilled} monsters. We called this function ${numCalls} times.`)
            started = Date.now()
            numKilled = 0
            numCalls = 0
        }

        const nearest = get_nearest_monster()
        if (!nearest) {
            set_message("No Monsters")
            return
        }

        if (can_attack(nearest)) {
            set_message("Attacking")
            attack(nearest)
        }
    } catch (e) {
        console.error(e)
    }
}