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
if (character.ctype !== "merchant") moveLoop()

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

async function lootLoop() {
    try {
        // The built in loot() does pretty much all of the work for us!
        loot()
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { lootLoop() }, 250)
}
if (!character.controller) lootLoop()

function filterPartyRequests(name) {
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
if (!character.controller) on_party_request = filterPartyRequests

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
        const hpRatio = character.hp / character.max_hp
        const hpMissing = character.max_hp - character.hp
        const mpRatio = character.mp / character.max_mp
        const mpMissing = character.max_mp - character.mp
        const minPing = Math.min(...parent.pings)

        if (character.rip) {
            // Don't heal if we're dead
            setTimeout(async () => { regenLoop() }, Math.max(100, ms_to_next_skill("use_hp")))
            return
        }

        if (mpRatio < hpRatio) {
            // We want to heal MP
            const mpot0 = locate_item("mpot0")
            const mpot0Recovery = G.items.mpot0.gives[0][1]
            const mpot1 = locate_item("mpot1")
            const mpot1Recovery = G.items.mpot1.gives[0][1]
            if (mpot1 !== -1 && mpMissing >= mpot1Recovery) {
                await equip(mpot1)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else if (mpot0 !== -1 && mpMissing >= mpot0Recovery) {
                await equip(mpot0)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else {
                await use_skill("regen_mp")
                // Use Skill doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            }
        } else if (character.hp !== character.max_hp) {
            // We want to heal HP
            const hpot0 = locate_item("hpot0")
            const hpot0Recovery = G.items.hpot0.gives[0][1]
            const hpot1 = locate_item("hpot1")
            const hpot1Recovery = G.items.hpot1.gives[0][1]

            if (hpot1 !== -1 && hpMissing >= hpot1Recovery) {
                await equip(hpot1)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else if (hpot0 !== -1 && hpMissing >= hpot0Recovery) {
                await equip(hpot0)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else {
                await use_skill("regen_hp")
                // Use Skill doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            }
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { regenLoop() }, Math.max(100, ms_to_next_skill("use_hp")))
}
regenLoop()

async function buyAndSendPotionsLoop(names) {
    try {
        //
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { buyAndSendPotionsLoop(names) }, 1000)
}

async function sendStuffLoop(name) {
    try {
        const merchant = parent.entities[name]
        if (merchant && distance(character, merchant) < 400) {
            for (let i = 0; i < character.isize; i++) {
                const item = character.items[i]
                if (!item) continue // No item
                if (item.l) continue // Don't send locked items
                if (["hpot1", "mpot1", "tracker", "computer"].includes(item.name)) continue // Don't send important items

                send_item(name, i, item.q ?? 1)
            }
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { sendStuffLoop() }, 1000)
}

function getCharacters(excludeSelf = true) {
    const characters = []

    for (const iframe of top.$("iframe")) {
        const char = iframe.contentWindow.character
        if (!char) continue // Character isn't loaded yet
        if (excludeSelf && char.name == character.name) continue
        characters.push(char)
    }

    return characters
}
function getCharacter(name) {
    for (const iframe of top.$("iframe")) {
        const char = iframe.contentWindow.character
        if (!char) continue // Character isn't loaded yet
        if (char.name == name) return char
    }
}
function getParentsOfCharacters(excludeSelf = true) {
    const parents = []

    for (const iframe of top.$("iframe")) {
        const char = iframe.contentWindow.character
        if (!char) continue // Character isn't loaded yet
        if (excludeSelf && char.name == character.name) continue
        parents.push(iframe.contentWindow)
    }

    return parents
}
function getParentOfCharacter(name) {
    for (const iframe of top.$("iframe")) {
        const char = iframe.contentWindow.character
        if (!char) continue // Character isn't loaded yet
        if (char.name == name) return iframe.contentWindow
    }
}