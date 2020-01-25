/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable no-undef */
import("http://localhost:3000/merchant.js")
    .then(() => {
        bots.merchant.run()
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