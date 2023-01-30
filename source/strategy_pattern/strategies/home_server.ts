import { Character, ServerIdentifier, ServerRegion } from "alclient"
import { Strategy } from "../context.js"

export class HomeServerStrategy<Type extends Character> implements Strategy<Type> {
    protected homeServer: string

    public constructor(region: ServerRegion, identifier: ServerIdentifier) {
        this.homeServer = `${region}${identifier}`
    }

    public async onApply(bot: Type) {
        if (bot.home == this.homeServer) return // Home server is set correctly
        if (`${bot.serverData.region}${bot.serverData.name}` !== this.homeServer) return // We're not on the home server we want to set

        // Set the home server to our current server
        await bot.setHome()
    }
}