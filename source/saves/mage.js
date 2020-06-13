/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

use_skill("town") // Try to teleport to town for safety

import("https://earthiverse.github.io/adventureland-bots/build/mage.js")
    .then(() => {
        bots.mage.run()
    }, () => {
        load_code("mage")
        bots.mage.run()
    })

function on_party_invite(name) {
    if (name != "earthiverse") return
    accept_party_invite(name)
}

function on_cm(name, data) {
    bots.mage.parseCM(name, data)
}