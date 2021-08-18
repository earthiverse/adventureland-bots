/* eslint-disable no-undef */
load_code("base") // Performs the healing and looting for us

/** Code for showing statistics every 10 minutes */
const TenMinutesInMs = 10 * 60 * 1000
let started
let numKilled = 0
let numCalls = 0
character.on("target_hit", (data) => { if (data.kill) numKilled += 1 })

/** Code to control multiple attacks */
const NUM_ATTACKS = 10
const ADDITIONAL_PING_PADDING_MS = 2

async function attackLoop() {
    try {
        /** Code for showing statistics every 10 minutes */
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
            const minPing = Math.min(pings2) + ADDITIONAL_PING_PADDING_MS // NOTE: pings2 is from base.js
            const maxPing = Math.max(pings2) - ADDITIONAL_PING_PADDING_MS
            const pingVariance = maxPing - minPing
            const numLoops = Math.min(NUM_ATTACKS, pingVariance) // If our ping is really really low, we might not have to send 10 attacks.
            for (let i = 1; i < numLoops; i++) {
                if (i == numLoops - 1) {
                    // It's our last attack, let's reduce_cooldown on this one
                    setTimeout(async () => {
                        await attack(nearest).catch(() => { /** Ignore Errors */ })
                        reduce_cooldown("attack", maxPing) // We're reducing by the max ping now, because we're sending multiple attacks
                    }, i * (pingVariance / numLoops))
                } else {
                    setTimeout(() => { parent.socket.emit("attack", { id: nearest.id }) }, i * (pingVariance / numLoops))
                }
            }
            parent.socket.emit("attack", { id: nearest.id })
            parent.skill_timeout("attack", 1000 / character.frequency) // Set the timeout to the theoretical maximum. Our calls to attack() will set the actual timeout.
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { attackLoop() }, Math.max(1, ms_to_next_skill("attack")))
}
attackLoop()