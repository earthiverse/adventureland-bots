import { Game } from "./game";
import { PlayerData, CharacterData, ActionData, NewMapData } from "./definitions/adventureland-server";
import { listen } from "socket.io";

export class Bot {
    private game: Game

    constructor(game: Game) {
        this.game = game
    }

    public async move() {
        this.game.socket
    }

    public async attack(id: string) {
        if (!this.game.entities.has(id)) return Promise.reject(`No Entity with ID '${id}'`)

        const attackStarted = new Promise((resolve) => {
            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.game.character.id) {
                    this.game.socket.removeListener("action", attackCheck)
                    resolve()
                }
            }
            this.game.socket.on("action", attackCheck)
        })
        const attackTimeout = new Promise((_resolve, reject) => setTimeout(reject, 5000))
        this.game.socket.emit("attack", { id: id })
        return Promise.race([attackStarted, attackTimeout])
    }

    public async warpToTown() {
        this.game.socket.emit("town")
        const currentMap = this.game.character.map
        const warpComplete = new Promise((resolve, reject) => {
            this.game.socket.once("new_map", (data: NewMapData) => {
                if (currentMap == data.map) resolve()
                else reject(`We are now in ${data.map}, but we should be in ${currentMap}`)
            })
        })
        const warpTimeout = new Promise((_resolve, reject) => setTimeout(reject, 5000))
        return Promise.race([warpComplete, warpTimeout])
    }
}