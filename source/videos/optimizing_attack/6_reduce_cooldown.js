/* eslint-disable no-undef */
load_code("base")

const TenMinutesInMs = 10 * 60 * 1000
let started
let numKilled = 0
let numCalls = 0
character.on("target_hit", (data) => { if (data.kill) numKilled += 1 })

async function attackLoop() {
    try {
        numCalls += 1
        if (started == undefined) started = Date.now()
        if (Date.now() > started + TenMinutesInMs) {
            show_json({
                script: "reduce_cooldown",
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
            await attack(nearest)
            /** NOTE: We're now reducing the cooldown based on the ping */
            reduce_cooldown("attack", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(attackLoop, Math.max(1, ms_to_next_skill("attack")))
}
attackLoop()