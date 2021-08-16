/* eslint-disable no-undef */
load_code("base") // Performs the healing, looting, and movement for us

/** Code for showing statistics every 10 minutes */
const TenMinutesInMs = 10 * 60 * 1000
let started
let numKilled = 0
let numCalls = 0
character.on("target_hit", (data) => { if (data.kill) numKilled += 1 })

setInterval(() => {
    /** Code for showing statistics every 10 minutes */
    numCalls += 1
    if (started == undefined) started = Date.now()
    if (Date.now() > started + TenMinutesInMs) {
        show_json(`We killed ${numKilled} monsters.\nWe called this function ${numCalls} times.`)
        started = Date.now()
        numKilled = 0
        numCalls = 0
    }

    /** Attacking code similar in function to the original default code the game provides */
    const nearest = get_nearest_monster()
    if (!nearest) {
        set_message("No Monsters")
        return
    }

    if (can_attack(nearest)) {
        set_message("Attacking")
        attack(nearest)
    }
}, 250 /** Attack every 250ms */)