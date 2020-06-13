/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

use_skill("town") // Try to teleport to town for safety

import("https://earthiverse.github.io/adventureland-bots/build/ranger.js")
    .then(() => {
        bots.ranger.run()
    }, () => {
        load_code("ranger")
        bots.ranger.run()
    })

const scripts = {
    //"earthWar": "warrior_start",
    //"earthPri": "priest_start",
    "earthMag": "mage_start",
    "earthMag2": "mage_start",
    "earthMer": "merchant_start"
}
for (const character in scripts) {
    if (!parent.party[character])
        start_character(character, scripts[character])
}

function on_cm(name, data) {
    bots.ranger.parseCM(name, data)
}

function on_magiport(name) {
    if(name != "earthMag" && name != "earthMag2") return
    accept_magiport(name)
}

pause()