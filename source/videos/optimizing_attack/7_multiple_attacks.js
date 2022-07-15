/* eslint-disable no-undef */
load_code("base")

const TenMinutesInMs = 10 * 60 * 1000
let started
let numKilled = 0
let numCalls = 0
character.on("target_hit", (data) => { if (data.kill) numKilled += 1 })

/** Code to control multiple attacks */
const NUM_ATTACKS = 9

async function attackLoop() {
    try {
        numCalls += 1
        if (started == undefined) started = Date.now()
        if (Date.now() > started + TenMinutesInMs) {
            show_json({
                script: "multiple_attacks",
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
            let numLoops = NUM_ATTACKS
            /** NOTE: We create an interval that sends 1 attack per ms for the number of attacks. */
            /** NOTE: The interval running every 1ms isn't guaranteed.  */
            const interval = setInterval(async () => {
                try {
                    if (numLoops <= 0) {
                        clearInterval(interval)
                        return
                    } else {
                        numLoops -= 1
                    }
                    await attack(nearest)
                    reduce_cooldown("attack", Math.min(...parent.pings) + Math.floor(NUM_ATTACKS / 2))
                } catch (e) {
                    console.error(e)
                }
            }, 1)

            await attack(nearest)
            reduce_cooldown("attack", Math.min(...parent.pings) + Math.floor(NUM_ATTACKS / 2))
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(attackLoop, Math.max(1, ms_to_next_skill("attack")))
}
attackLoop()