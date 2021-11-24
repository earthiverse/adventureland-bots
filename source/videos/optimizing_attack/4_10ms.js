/* eslint-disable no-undef */
load_code("base")

const TenMinutesInMs = 10 * 60 * 1000
let started
let numKilled = 0
let numCalls = 0
character.on("target_hit", (data) => { if (data.kill) numKilled += 1 })

setInterval(async () => {
    numCalls += 1
    if (started == undefined) started = Date.now()
    if (Date.now() > started + TenMinutesInMs) {
        show_json({
            script: "10ms",
            numKilled: numKilled,
            numCalls: numCalls,
            pings: parent.pings,
            level: character.level,
            server: server
        })
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
        /** NOTE: We're now awaiting the attack */
        await attack(nearest)
    }
}, 10 /** NOTE: We are now looping every 10ms */)