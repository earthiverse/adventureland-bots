import axios from "axios"
import socketio from "socket.io-client"
import { ServerData, WelcomeData, LoadedData, EntitiesData, GameResponseData, AuthData, StartData, EntityData, CharacterData, PartyData, ChestData, PlayerData, QData, DisappearData, ChestOpenedData, HitData } from "./definitions/adventureland-server"
import { ServerRegion, ServerIdentifier, CharacterEntity } from "./definitions/adventureland"

export class Game {
    public socket: SocketIOClient.Socket
    private promises: Promise<boolean>[]

    public G: any

    public character: CharacterData
    public chests = new Map<string, ChestData>()
    public entities = new Map<string, EntityData>()
    public party: PartyData
    public players = new Map<string, PlayerData>()

    constructor(region: ServerRegion, name: ServerIdentifier) {
        this.promises.push(new Promise<boolean>((resolve, reject) => {
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
        }), new Promise<boolean>((resolve, reject) => {
            Game.getGameData().then((data) => {
                this.G = data
            })
        }))
    }

    private parseCharacter(data: CharacterData) {
        this.character = {
            hp: data.hp,
            max_hp: data.max_hp,
            mp: data.mp,
            max_mp: data.max_mp,
            attack: data.attack,
            frequency: data.frequency,
            speed: data.speed,
            range: data.range,
            armor: data.armor,
            resistance: data.resistance,
            level: data.level,
            rip: data.rip,
            afk: data.afk,
            s: data.s,
            c: data.c,
            q: data.q,
            age: data.age,
            pdps: data.pdps,
            id: data.id,
            x: data.x,
            y: data.y,
            cid: data.cid,
            stand: data.stand,
            controller: data.controller,
            skin: data.skin,
            cx: data.cx,
            slots: data.slots,
            ctype: data.ctype,
            owner: data.owner,
            int: data.int,
            str: data.str,
            dex: data.dex,
            vit: data.vit,
            for: data.for,
            mp_cost: data.mp_cost,
            max_xp: data.max_xp,
            goldm: data.goldm,
            xpm: data.xpm,
            luckm: data.luckm,
            map: data.map,
            in: data.in,
            isize: data.isize,
            esize: data.esize,
            gold: data.gold,
            cash: data.cash,
            targets: data.targets,
            m: data.m,
            evasion: data.evasion,
            miss: data.miss,
            reflection: data.reflection,
            lifesteal: data.lifesteal,
            manasteal: data.manasteal,
            rpiercing: data.rpiercing,
            apiercing: data.apiercing,
            crit: data.crit,
            critdamage: data.critdamage,
            dreturn: data.dreturn,
            tax: data.tax,
            xrange: data.xrange,
            items: data.items,
            cc: data.cc,
            ipass: data.ipass,
            friends: data.friends,
            acx: data.acx,
            xcx: data.xcx
        }
    }

    private parseEntities(data: EntitiesData) {
        // console.log("socket: entities!")
        // console.log(data)

        if (data.type == "all") {
            // Erase all of the entities
            this.entities.clear()
            this.players.clear()
        }

        for (let monster of data.monsters) {
            this.entities.set(monster.id, monster)
        }
        for (let player of data.players) {
            this.players.set(player.id, player)
        }
    }

    private prepare() {
        this.socket.on("action", (data: any) => {
            // console.log("socket: action!")
            // console.log(data)
        })

        // on("connect")

        this.socket.on("chest_opened", (data: ChestOpenedData) => {
            this.chests.delete(data.id)
        })

        this.socket.on("disappear", (data: DisappearData) => {
            this.players.delete(data.id)
        })

        this.socket.on("drop", (data: ChestData) => {
            this.chests.set(data.id, data)
        })

        this.socket.on("entities", (data: EntitiesData) => {
            this.parseEntities(data)
        })

        // TODO: Figure out type. I think it's just a string?
        this.socket.on("game_error", (data: any) => {
            console.error(`Game Error: ${data}`)
        })

        this.socket.on("game_response", (data: GameResponseData) => {
            if (typeof data == "string") {
                console.info(`Game Response: ${data}`)
            } else if (data.response == "gold_received") {
                this.character.gold += data.gold
            }
        })

        this.socket.on("hit", (data: HitData) => {
            // console.log("socket: hit!")
            // console.log(data)
            if (data.anim == "miss") return
            
            if (data.kill == true) {
                this.entities.delete(data.id)
            }
        })

        this.socket.on("party_update", (data: PartyData) => {
            this.party = data
        })

        this.socket.on("player", (data: CharacterData) => {
            this.parseCharacter(data)
        })

        this.socket.on("q_data", (data: QData) => {

        })

        this.socket.on("start", (data: StartData) => {
            console.log("socket: start!")
            console.log(data)
            this.parseCharacter(data)
            this.parseEntities(data.entities)
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
        await Promise.all(this.promises)

        // TODO: receive on("start")

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

    static async getGameData(): Promise<any> {
        const result = await axios.get("http://adventure.land/data.js")
        if (result.status == 200) {
            // Update X.servers with the latest data
            let matches = result.data.match(/var\s+G\s*=\s*(\{.+\});/)
            return JSON.parse(matches[1])
        }
    }

    static async getServerList(): Promise<ServerData[]> {
        // Get a list of the servers available
        const result = await axios.get("http://adventure.land")
        if (result.status == 200) {
            // We got a result!
            let matches = result.data.match(/X\.servers=(\[.+\]);/)
            return JSON.parse(matches[1])
        }
    }
}