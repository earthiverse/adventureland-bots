/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

function ms_to_next_skill(skill) {
    const next_skill = parent.next_skill[skill]
    if (next_skill == undefined) return 0
    const ms = parent.next_skill[skill].getTime() - Date.now()
    return ms < 0 ? 0 : ms
}

async function moveLoop() {
    try {
        let nearest = get_nearest_monster()
        if (!is_in_range(nearest)) {
            // Move closer
            move(
                character.x + (nearest.x - character.x) / 2,
                character.y + (nearest.y - character.y) / 2
            )
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { moveLoop() }, 250)
}
moveLoop()

async function lootLoop() {
    try {
        // The built in loot() does pretty much all of the work for us!
        loot()
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { lootLoop() }, 250)
}
lootLoop()

function on_party_request(name) {
    for (const c of parent.X.characters) {
        if (c.name == name) {
            // It's one of our characters
            accept_party_request(name)
            return
        }
    }

    // NOTE: If you want to let other players' characters join your party, add code here.

    // It's not one of our characters
    game_log(`Ignoring ${name}'s party request.`)
}

async function partyLoop() {
    try {
        if (!character.party) {
            // We are not in a party

            if (character.controller) {
                // We are running in an iframe, send a party request to the controller
                send_party_request(character.controller)
            }
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { partyLoop() }, 10000)
}
if (character.controller) partyLoop()

/**
 * Shows statistics every 10 minutes
 * @param {*} scriptName Name of the script, so we can keep track
 * @param {*} characters List of characters to track
 */
function startStatisticsLoop(scriptName, characters) {
    const tenMinutesInMs = 10 * 60 * 1000
    let started = Date.now()
    let numKilled = 0
    game.on("hit", (data) => {
        if (!characters.includes(data.hid)) return // Not our character
        if (data.kill) numKilled += 1
    })
    function statisticsLoop() {
        try {
            show_json({
                script: scriptName,
                numKilled: numKilled,
                pings: parent.pings,
                level: character.level,
                server: server
            })
            started = Date.now()
            numKilled = 0
        } catch (e) {
            console.error(e)
        }
        setTimeout(() => { statisticsLoop() }, tenMinutesInMs)
    }
    statisticsLoop()
}


async function regenLoop() {
    try {
        const hp_ratio = character.hp / character.max_hp
        const mp_ratio = character.mp / character.max_mp

        // NOTE: If you want to use potions, modify this function,
        // because potions share a cooldown with regen_hp and regen_mp

        if (mp_ratio < hp_ratio && can_use("regen_mp")) {
            // We have less MP than HP, so let's regen some MP.
            await use_skill("regen_mp")
            reduce_cooldown("regen_mp", Math.min(...parent.pings))
        } else if (can_use("regen_hp")) {
            // We have less HP than MP, so let's regen some HP.
            await use_skill("regen_hp")
            reduce_cooldown("regen_hp", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { regenLoop() }, Math.max(100, ms_to_next_skill("use_hp")))
}
regenLoop()