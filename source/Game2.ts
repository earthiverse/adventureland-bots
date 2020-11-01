import alclient from "alclient"
import { ServerIdentifier, ServerRegion } from "alclient/build/definitions/adventureland"
import { Observer2 } from "./Observer2"
const { Game } = alclient

export class Game2 extends Game {
    static async startObserver(region: ServerRegion, id: ServerIdentifier): Promise<Observer2> {
        try {
            const g = await Game.getGData()
            const observer = new Observer2(this.servers[region][id], g, true)
            await observer.connect()

            this.observers[this.servers[region][id].key] = observer
            return observer
        } catch (e) {
            return Promise.reject(e)
        }
    }
}