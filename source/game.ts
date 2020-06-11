import axios from "axios"
import socketio from "socket.io-client"
import { ServerData, WelcomeData, LoadedData, EntitiesData, GameResponseData, AuthData } from "./definitions/adventureland-server"
import { ServerRegion, ServerIdentifier, Entity, CharacterEntity } from "./definitions/adventureland"

export class Game {
    public socket: SocketIOClient.Socket
    private connecting: Promise<boolean>

    public character: CharacterEntity
    public entities: { [id: string]: Entity }

    constructor(region: ServerRegion, name: ServerIdentifier) {
        this.connecting = new Promise<boolean>((resolve, reject) => {
            Game.getServerList().then((data) => {
                // Find the address of the server we want to connect to
                for (let server of data) {
                    if (server.region == region && server.name == name) {
                        this.socket = socketio(`ws://${server.addr}:${server.port}`, {
                            autoConnect: false,
                            transports: ["websocket"]
                        })
                        resolve()
                        this.prepare()
                        return
                    }
                }
                reject()
                return
            })
        })
    }

    private prepare() {
        this.socket.on("action", (data: any) => {
            // console.log("socket: action!")
            // console.log(data)
        })

        // on("connect")

        this.socket.on("entities", (data: EntitiesData) => {
            // console.log("socket: entities!")
            // console.log(data)

            if (data.type == "all") {
                // TODO: Probably erase all of the entities?
            }

            for (let monster of data.monsters) {

            }
            for (let player of data.players) {

            }
        })

        this.socket.on("game_error", (data) => {
            console.log("socket: game_error!")
            console.log(data)
        })

        this.socket.on("game_response", (data: GameResponseData) => {
            console.log("socket: game_response!")
            console.log(data)
            if (data.response == "gold_received") {
                this.character.gold += data.gold
            }
        })

        this.socket.on("hit", (data) => {
            // console.log("socket: hit!")
            // console.log(data)
        })

        this.socket.on("welcome", (data: WelcomeData) => {
            console.log("socket: welcome!")
            console.log(data)

            // Send a response that we're ready to go
            console.log("socket: loaded...")
            this.socket.emit("loaded", {
                height: 1080,
                width: 1920,
                scale: 2,
                success: 1
            } as LoadedData)
        })
    }

    async connect(auth: string, character: string, user: string) {
        if (this.connecting) await this.connecting

        // TODO: receive on("start")
        this.socket.once("start", (data) => {
            console.log("socket: start!")
            console.log(data)

            console.log("CLOSING!")
            this.socket.close()
        })

        this.socket.open()

        // When we're loaded, authenticate
        this.socket.once("welcome", () => {
            console.log("socket: authenticating...")
            this.socket.emit("auth", {
                auth: auth,
                character: character,
                height: 1080,
                no_graphics: "True",
                no_html: "1",
                passphrase: "",
                scale: 2,
                user: user,
                width: 1920
            } as AuthData)
        })

    }

    async disconnect() {
        this.socket.close()
    }

    static async getServerList(): Promise<ServerData[]> {
        // Get a list of the servers available
        const result = await axios.get("http://adventure.land")
        if (result.status == 200) {
            // Update X.servers with the latest data
            let matches = result.data.match(/X\.servers=(\[.+\]);/)
            return JSON.parse(matches[1])
        }
    }
}