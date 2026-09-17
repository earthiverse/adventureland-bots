/* eslint-disable no-undef */
async function attackLoop() {
    try {
        const target = get_nearest_monster()
        if (target && character.range >= distance(character, target)) {
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
