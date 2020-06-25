/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

use_skill("town") // Try to teleport to town for safety

import("https://earthiverse.github.io/adventureland-bots/build/merchant.js")
    .then(() => {
        bots.merchant.run()

        // Show Quest Info Periodically
        // TODO: Make a GUI element that shows this information instead
        function reviver(key, value) {
            if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
                return new Date(value)
            }
            return value
        }

        function showMHInfo() {
            // MH Quests
            const party = JSON.parse(localStorage.getItem(`${parent.server_region}.${parent.server_identifier}_party`), reviver) || {}
            for (const id in party) {
                if (!parent.party_list.includes(id)) continue
                const member = party[id]
                if (member.s.monsterhunt) {
                    game_log(member.s.monsterhunt.id + ": " + member.s.monsterhunt.c + " in " + Math.floor(member.s.monsterhunt.ms / 1000 / 60) + "m")
                }
            }

            // MH Coin count
            let coins = locate_item("monstertoken") == -1 ? 0 : parent.character.items[locate_item("monstertoken")].q
            coins += parent.character.slots.trade1 == undefined ? 0 : parent.character.slots.trade1.q
            game_log(`Coins: ${coins}`)

            setTimeout(() => {
                showMHInfo()
            }, 10000)
        }
        showMHInfo()
    }, () => {
        load_code("merchant")
        bots.merchant.run()
    })

function on_party_invite(name) {
    if (name != "earthiverse") return
    accept_party_invite(name)
}

function on_cm(name, data) {
    bots.merchant.parseCM(name, data)
}