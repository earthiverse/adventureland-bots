/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

// Constants
const MPOT0_RECOVERY = G.items.mpot0.gives[0][1]
const MPOT1_RECOVERY = G.items.mpot1.gives[0][1]
const HPOT0_RECOVERY = G.items.hpot0.gives[0][1]
const HPOT1_RECOVERY = G.items.hpot1.gives[0][1]

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function ms_to_next_skill(skill) {
    const next_skill = parent.next_skill[skill]
    if (next_skill == undefined) return 0
    const ms = parent.next_skill[skill].getTime() - Date.now()
    return ms < 0 ? 0 : ms
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
        if (!char.controller) {
            parents.push(top)
        } else {
            parents.push(iframe.contentWindow)
        }
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
        for (const id in parent.chests) {
            // Don't open far away chests
            const chest = parent.chests[id]
            if (distance(character, chest) > 800) continue

            // Remove the chests from the others to lower call code cost opening already opened chests
            for (const friendsParent of getParentsOfCharacters(true)) {
                if (friendsParent == top) continue // Don't delete from
                delete friendsParent.chests[id]
            }

            parent.socket.emit("open_chest", { id: id })
            break
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { lootLoop() }, 100)
}
if (character.controller) lootLoop()

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
    let numKilled = 0
    game.on("hit", (data) => {
        if (!characters.includes(data.actor)) return // Not our character
        if (data.kill) numKilled += 1
    })
    statisticsLoop = () => {
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
            const mpot1 = locate_item("mpot1")

            if (mpot1 !== -1 && mpMissing >= MPOT1_RECOVERY) {
                await equip(mpot1)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else if (mpot0 !== -1 && mpMissing >= MPOT0_RECOVERY) {
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
            const hpot1 = locate_item("hpot1")

            if (hpot1 !== -1 && hpMissing >= HPOT1_RECOVERY) {
                await equip(hpot1)
                // Equip doesn't return a promise yet. When it does, remove the setTimeout to just the function inside of it
                setTimeout(() => { reduce_cooldown("use_hp", minPing) }, 2 * minPing)
            } else if (hpot0 !== -1 && hpMissing >= HPOT0_RECOVERY) {
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
        // If we don't have a computer don't buy and send potions.
        const hasComputer = locate_item("computer") !== -1
        if (!hasComputer) return

        // Check all friends
        for (const friend of getCharacters(true)) {
            if (distance(character, friend) > 400) continue // Friend is too far away

            const toHold = {
                "hpot1": 2500,
                "mpot1": 2500
            }

            for (let i = 0; i < friend.isize; i++) {
                const item = friend.items[i]
                if (!item) continue // No item in this slot
                if (!toHold[item.name]) continue // Not interested in this item
                toHold[item.name] -= item.q
                if (toHold[item.name] < 0) delete toHold[item.name]
            }

            for (const itemName in toHold) {
                const qToSend = toHold[itemName]
                const ourQ = quantity(itemName)
                const ourQAfterSending = ourQ - qToSend

                // Buy enough so we have 2500 on the merchant after sending
                if (ourQAfterSending < 2500) await buy(itemName, 1000 - qToSend)
                await buy(itemName, qToSend)
                await send_item(friend.id, locate_item(itemName), qToSend)
            }
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { buyAndSendPotionsLoop(names) }, 1000)
}

async function sendStuffLoop(name) {
    try {
        const sendTo = parent.entities[name]
        if (sendTo && distance(character, sendTo) < 400) {
            for (let i = 0; i < character.isize; i++) {
                const item = character.items[i]
                if (!item) continue // No item
                if (item.l) continue // Don't send locked items
                if (["hpot1", "mpot1", "tracker", "computer"].includes(item.name)) continue // Don't send important items

                await send_item(name, i, item.q ?? 1)
            }

            if (character.gold > 1_000_000) await send_gold(sendTo, character.gold - 1_000_000)
        }
    } catch (e) {
        console.error(e)
    }
    setTimeout(async () => { sendStuffLoop(name) }, 1000)
}