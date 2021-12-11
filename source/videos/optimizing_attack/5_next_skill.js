/* eslint-disable no-undef */
load_code("base")

const TenMinutesInMs = 10 * 60 * 1000
let started
let numKilled = 0
let numCalls = 0
character.on("target_hit", (data) => { if (data.kill) numKilled += 1 })

async function attackLoop() {
    /** NOTE: We're now using a try/catch so setTimeout will still be called if our code fails for whatever reason */
    try {
        numCalls += 1
        if (started == undefined) started = Date.now()
        if (Date.now() > started + TenMinutesInMs) {
            show_json({
                script: "next_skill",
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
        } else if (can_attack(nearest)) {
            set_message("Attacking")
            /** NOTE: We're now awaiting the attack */
            await attack(nearest)
        }
    } catch (e) {
        console.error(e)
    }
    // NOTE: We are now using setTimeout instead of setInterval, so our next attack will dynamically adjust when it runs
    // NOTE: ms_to_next_skill is from base.js
    setTimeout(async () => { attackLoop() }, Math.max(1, ms_to_next_skill("attack")))
}
attackLoop()