/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

use_skill("town") // Try to teleport to town for safety

import("https://earthiverse.github.io/adventureland-bots/build/rogue.js")
    .then(() => {
        bots.rogue.run()
    }, () => {
        load_code("rogue")
        bots.rogue.run()
    })

function on_party_invite(name) {
    if (name != "earthiverse") return
    accept_party_invite(name)
}

function on_cm(name, data) {
    bots.rogue.parseCM(name, data)
}

function on_magiport(name) {
    if(name != "earthMag") return
    accept_magiport(name)
}

function on_combined_damage() {
    let x = -10 + Math.round(20 * Math.random())
    let y = -10 + Math.round(20 * Math.random())
    move(parent.character.real_x + x, parent.character.real_y + y)
}