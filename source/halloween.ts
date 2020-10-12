import { ServerIdentifier, ServerRegion } from "./definitions/adventureland"
// TODO: Farm minimush until a server appears with a special monster

import { Game, Observer } from "./game.js"

async function start() {
    await Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpasswordlol")

    // Start observers
    const observers: Observer[] = []
    for (const server of [["ASIA", "I"], ["US", "I"], ["US", "II"], ["US", "III"], ["EU", "I"], ["EU", "II"]] as [ServerRegion, ServerIdentifier][]) {
        observers.push(await Game.startObserver(server[0], server[1]))
    }

    // Start bot
}