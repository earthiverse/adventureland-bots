/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable no-undef */
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

        function showQuests() {
            const party = JSON.parse(sessionStorage.getItem("party"), reviver) || {}
            for (const id in party) {
                if (!parent.party_list.includes(id)) continue
                const member = party[id]
                if (member.s.monsterhunt) {
                    game_log(member.s.monsterhunt.id + ": " + member.s.monsterhunt.c + " in " + Math.floor(member.s.monsterhunt.ms / 1000 / 60) + "m")
                }
            }
            game_log("Coins: " + parent.character.items[30].q)
            setTimeout(() => {
                showQuests()
            }, 10000)
        }
        showQuests()
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