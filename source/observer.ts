import axios from "axios"
import socketio from "socket.io-client"
import { ServerData, DeathData, EntitiesData, NewMapData, WelcomeData, LoadedData } from "./definitions/adventureland-server"
import { ServerRegion, ServerIdentifier, GData, MapName, MonsterName, SInfo } from "./definitions/adventureland"
import { CharacterModel } from "./database/characters/characters.model.js"
import { EntityModel } from "./database/entities/entities.model.js"
import { SPECIAL_MONSTERS } from "./constants.js"


export class Observer {
    public socket: SocketIOClient.Socket;

    public G: GData;

    protected serverRegion: ServerRegion;
    protected serverIdentifier: ServerIdentifier;
    protected map: MapName;
    protected x: number;
    protected y: number;

    constructor(serverData: ServerData, g: GData, reconnect = false) {
        this.serverRegion = serverData.region
        this.serverIdentifier = serverData.name
        this.G = g

        this.socket = socketio(`ws://${serverData.addr}:${serverData.port}`, {
            autoConnect: false,
            reconnection: reconnect,
            transports: ["websocket"]
        })

        this.socket.on("welcome", (data: WelcomeData) => {
            this.map = data.map
            this.x = data.x
            this.y = data.y

            // Send a response that we're ready to go
            this.socket.emit("loaded", {
                height: 1080,
                width: 1920,
                scale: 2,
                success: 1
            } as LoadedData)
        })

        this.socket.on("death", async (data: DeathData) => {
            try {
                await EntityModel.deleteOne({ name: data.id }).exec()
            } catch (e) {
                // There probably wasn't an entity with that ID (this will happen a lot)
            }
        })

        this.socket.on("entities", (data: EntitiesData) => {
            this.parseEntities(data)
        })

        this.socket.on("new_map", (data: NewMapData) => {
            this.map = data.name
            this.x = data.x
            this.y = data.y
            this.parseEntities(data.entities)
        })

        let lastUpdate = Number.MIN_VALUE
        this.socket.on("server_info", async (data: SInfo) => {
            // Help out super in his data gathering
            if (Date.now() > lastUpdate - 10000) {
                lastUpdate = Date.now()
                const statuses: any[] = []
                for (const mtype in data) {
                    const info = data[mtype]
                    if (info.live && info.hp == undefined) {
                        info.hp = this.G.monsters[mtype as MonsterName].hp
                        info.max_hp = this.G.monsters[mtype as MonsterName].hp
                    }
                    if (typeof info == "object") {
                        statuses.push({
                            ...data[mtype],
                            eventname: mtype,
                            server_region: this.serverRegion,
                            server_identifier: this.serverIdentifier
                        })
                    }
                }
                for (const status of statuses) {
                    try {
                        await axios.post("https://aldata.info/api/serverstatus", status, {
                            headers: {
                                "content-type": "application/json"
                            }
                        })
                    } catch (e) { /* Supress Errors */ }
                }
            }
        })
        this.socket.on("server_info", async (data: SInfo) => {
            for (const mtype in data) {
                const info = data[mtype as MonsterName]
                if (!info.live) {
                    EntityModel.deleteOne({ type: mtype as MonsterName, serverIdentifier: this.serverIdentifier, serverRegion: this.serverRegion }).exec()
                } else if (SPECIAL_MONSTERS.includes(mtype as MonsterName)) {
                    // Update Soft Properties
                    if (info.hp == undefined)
                        info.hp = this.G.monsters[mtype as MonsterName].hp

                    // console.log(`updating ${mtype} on ${this.serverRegion}${this.serverIdentifier} with server_info`)
                    EntityModel.updateOne({ type: mtype as MonsterName, serverIdentifier: this.serverIdentifier, serverRegion: this.serverRegion }, {
                        map: info.map,
                        x: info.x,
                        y: info.y,
                        target: info.target,
                        serverRegion: this.serverRegion,
                        serverIdentifier: this.serverIdentifier,
                        lastSeen: Date.now(),
                        hp: info.hp,
                        type: mtype as MonsterName
                    }, { upsert: true, useFindAndModify: false }).exec()
                }
            }
        })
    }

    protected async parseEntities(data: EntitiesData): Promise<void> {
        // Update all the players
        // TODO: Can we optimize this to update many?
        for (const player of data.players) {
            if (player.npc) {
                // TODO: Update NPCs if they walk around
            } else {
                CharacterModel.updateOne({ name: player.id }, {
                    map: data.map,
                    name: player.id,
                    x: player.x,
                    y: player.y,
                    serverRegion: this.serverRegion,
                    serverIdentifier: this.serverIdentifier,
                    lastSeen: Date.now(),
                    s: player.s
                }, { upsert: true, useFindAndModify: false }).exec()
            }
        }

        // Update entities if they're special
        // TODO: Can we optimize this to update many?
        for (const entity of data.monsters) {
            if (!SPECIAL_MONSTERS.includes(entity.type))
                continue

            if (entity.hp == undefined) {
                entity.hp = this.G.monsters[entity.type].hp
            }

            // console.log(`updating ${entity.type} on ${this.serverRegion}${this.serverIdentifier} with entity info`)
            await EntityModel.updateOne({ type: entity.type, serverIdentifier: this.serverIdentifier, serverRegion: this.serverRegion }, {
                map: data.map,
                name: entity.id,
                x: entity.x,
                y: entity.y,
                target: entity.target,
                serverRegion: this.serverRegion,
                serverIdentifier: this.serverIdentifier,
                lastSeen: Date.now(),
                level: entity.level ? entity.level : 1,
                hp: entity.hp,
                type: entity.type
            }, { upsert: true, useFindAndModify: false }).exec()
        }
    }

    public async connect(): Promise<unknown> {
        console.log(`Connecting to ${this.serverRegion}${this.serverIdentifier}...`)
        const connected = new Promise<unknown>((resolve, reject) => {
            this.socket.on("welcome", (data: WelcomeData) => {
                if (data.region !== this.serverRegion || data.name !== this.serverIdentifier) {
                    reject(`We wanted the server ${this.serverRegion}${this.serverIdentifier}, but we are on ${data.region}${data.name}.`)
                }

                resolve()
            })

            setTimeout(() => {
                reject("Failed to start within 10s.")
            }, 10000)
        })

        this.socket.open()
        return connected
    }
}
