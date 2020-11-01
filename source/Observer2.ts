import alclient from "alclient"
import { GData } from "alclient/build/definitions/adventureland"
import { DeathData, ServerData } from "alclient/build/definitions/adventureland-server"
import { EntityModel } from "./database/entities/entities.model"
const { Observer } = alclient

export class Observer2 extends Observer {
    constructor(serverData: ServerData, g: GData, reconnect = false) {
        super(serverData, g, reconnect)

        this.socket.on("death", async (data: DeathData) => {
            try {
                await EntityModel.deleteOne({ name: data.id }).exec()
            } catch (e) {
                // There probably wasn't an entity with that ID (this will happen a lot)
            }
        })
    }    
}