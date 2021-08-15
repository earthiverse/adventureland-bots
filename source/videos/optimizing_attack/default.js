/* eslint-disable no-undef */
load_code("base")

const started = Date.now()
const TenMinutesInMs = 10 * 60 * 1000

let numKilled = 0

character.on("target_hit", (data) => {
    if (data.kill) numKilled += 1
})

const interval = setInterval(() => {
    if (Date.now() > started + TenMinutesInMs) {
        show_json(`We killed ${numKilled} monsters.`)
        clearInterval(interval)
        return
    }

    var target = get_targeted_monster()
    if (!target) {
        target = get_nearest_monster({ max_att: 120, min_xp: 100 })
        if (target) change_target(target)
        else {
            set_message("No Monsters")
            return
        }
    }

    if (!is_in_range(target)) {
        move(
            character.x + (target.x - character.x) / 2,
            character.y + (target.y - character.y) / 2
        )
        // Walk half the distance
    }
    else if (can_attack(target)) {
        set_message("Attacking")
        attack(target)
    }
}, 1000 / 4)