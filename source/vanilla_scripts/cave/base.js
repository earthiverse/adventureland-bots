function ms_to_next_skill(skill) {
    const next_skill = parent.next_skill[skill]
    if (next_skill == undefined) return 0
    const ms = parent.next_skill[skill].getTime() - Date.now()
    return ms < 0 ? 0 : ms
}

/* eslint-disable no-undef */
async function attackLoop() {
    try {
        // TODO: How do i tell if it's friendly or not?
        // const corneredRogue = get_nearest_monster({ type: "cave_rogue" })
        // if (corneredRogue) return // Don't attack anything, let the monsters kill the rogue

        const darkMage = get_nearest_monster({ type: "cave_darkmage" })
        if (darkMage) {
            if (character.ctype === "mage") {
                await use_skill("reflection", character) // Cast reflection on self to increase reflection
                // TODO: Equip as much reflection as we can
            } else {
                return // Don't do anything, let mage handle it
            }
        }

        // Heal with priest
        if (character.ctype === "priest") {
            if (character.hp < character.max_hp * 0.7) {
                await heal(character)
                reduce_cooldown("attack", Math.min(...parent.pings))
                return
            }
            for (const partyMemberName of parent.party_list) {
                const partyMember = parent.entities[partyMemberName]
                if (!partyMember) continue
                if (partyMember.hp < partyMember.max_hp * 0.7) {
                    await heal(partyMember)
                    reduce_cooldown("attack", Math.min(...parent.pings))
                    return
                }
            }
        }

        // TODO: Character specific buffs

        // Attack nearest monster
        const target = get_nearest_monster({ min_xp: 1 })
        if (!target) return // No target

        if (character.range >= distance(character, target)) {
            await attack(target)
            reduce_cooldown("attack", Math.min(...parent.pings))
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(attackLoop, Math.max(100, parent.next_skill["attack"].getTime() - Date.now()))
    }
}
attackLoop()

const MPOT0_RECOVERY = G.items.mpot0.gives[0][1]
const MPOT1_RECOVERY = G.items.mpot1.gives[0][1]
const HPOT0_RECOVERY = G.items.hpot0.gives[0][1]
const HPOT1_RECOVERY = G.items.hpot1.gives[0][1]
async function regenLoop() {
    try {
        const hpRatio = character.hp / character.max_hp
        const hpMissing = character.max_hp - character.hp
        const mpRatio = character.mp / character.max_mp
        const mpMissing = character.max_mp - character.mp
        const minPing = Math.min(...parent.pings)

        if (character.rip) return // Don't heal if we're dead

        if (mpRatio < hpRatio) {
            // We want to regen MP
            const mpot0 = locate_item("mpot0")
            const mpot1 = locate_item("mpot1")

            if (mpot1 !== -1 && mpMissing >= MPOT1_RECOVERY) {
                await equip(mpot1)
                reduce_cooldown("use_hp", minPing)
            } else if (mpot0 !== -1 && mpMissing >= MPOT0_RECOVERY) {
                await equip(mpot0)
                reduce_cooldown("use_hp", minPing)
            }
        } else if (character.hp !== character.max_hp) {
            // We want to regen HP
            const hpot0 = locate_item("hpot0")
            const hpot1 = locate_item("hpot1")

            if (hpot1 !== -1 && hpMissing >= HPOT1_RECOVERY) {
                await equip(hpot1)
                reduce_cooldown("use_hp", minPing)
            } else if (hpot0 !== -1 && hpMissing >= HPOT0_RECOVERY) {
                await equip(hpot0)
                reduce_cooldown("use_hp", minPing)
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(regenLoop, Math.max(100, ms_to_next_skill("use_hp")))
    }
}
regenLoop()

async function lootLoop() {
    try {
        // The built in loot() does pretty much all of the work for us!
        loot()
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(lootLoop, 250)
    }
}
lootLoop()

async function caveLoop() {
    try {
        // TODO: Cave Logic
        // character.cave.choice.id
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(caveLoop, 250)
    }
}
caveLoop()

async function goToNextObjective() {
    const currentFloor = parseInt(character.map.at(-1))
    const pendingObjectives = character.cave?.objectives?.filter((obj) => !obj.done && obj.floor === currentFloor)
    if (!pendingObjectives || pendingObjectives.length === 0) await goToNextDoor() // No more objectives

    // Find and go to the next closest one
    const closest = pendingObjectives.reduce((nearest, obj) => {
        return distance(character, obj) < distance(character, nearest) ? obj : nearest
    })
    await smart_move(closest)
    return closest
}

async function goToNextDoor() {
    const nextDoor = character.cave?.doors?.find((d) => d.down)
    if (!nextDoor) return // No door
    await smart_move(nextDoor)
}
