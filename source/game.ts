import axios from "axios"
import socketio from "socket.io-client"
import { ServerData, WelcomeData, LoadedData, EntitiesData, GameResponseData, AuthData, StartData, EntityData, CharacterData, PartyData, ChestData, PlayerData, DisappearData, ChestOpenedData, HitData, NewMapData, ActionData, EvalData, DeathData, AchievementProgressData } from "./definitions/adventureland-server"
import { ServerRegion, ServerIdentifier, SkillName, GData, BankInfo } from "./definitions/adventureland"
import { Tools } from "./tools.js"

export class Game {
    private promises: Promise<boolean>[] = []
    private lastUpdate: number

    public active = false
    public socket: SocketIOClient.Socket

    public G: GData

    public achievements = new Map<string, AchievementProgressData>()
    public bank: BankInfo
    public character: CharacterData
    public chests = new Map<string, ChestData>()
    public entities = new Map<string, EntityData>()
    public nextSkill = new Map<SkillName, Date>()
    public party: PartyData
    public players = new Map<string, PlayerData>()
    public projectiles = new Map<string, ActionData & { date: Date }>()
    public server: WelcomeData

    constructor(region: ServerRegion, name: ServerIdentifier) {
        this.promises.push(new Promise<boolean>((resolve, reject) => {
            this.getServerList().then((data) => {
                // Find the address of the server we want to connect to
                for (const server of data) {
                    if (server.region == region && server.name == name) {
                        this.socket = socketio(`ws://${server.addr}:${server.port}`, {
                            autoConnect: false,
                            transports: ["websocket"]
                        })
                        this.prepare()
                        resolve()
                        return
                    }
                }
                reject()
                return
            })
        }), new Promise<boolean>((resolve) => {
            if (!this.G) {
                this.getGameData().then((data) => {
                    this.G = data
                    resolve()
                })
            }
        }))
    }

    private parseCharacter(data: CharacterData) {
        // Update all the character information we can
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
            going_x: data.going_x,
            going_y: data.going_y,
            moving: data.moving,
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

        // Update Bank information if it's available
        if (data.user) this.bank = data.user
    }

    private parseEntities(data: EntitiesData) {
        // console.log("socket: entities!")
        // console.log("updating entities")
        // console.log(data)

        if (data.type == "all") {
            // Erase all of the entities
            this.entities.clear()
            this.players.clear()
        } else if (this.character) {
            // Erase all players and entities that are more than 600 units away
            let toDelete: string[] = []
            for (const [id, entity] of this.entities) {
                if (Tools.distance(this.character, entity) < 600) continue
                toDelete.push(id)
            }
            for (const id of toDelete) this.entities.delete(id)
            toDelete = []
            for (const [id, player] of this.players) {
                if (Tools.distance(this.character, player) < 600) continue
                toDelete.push(id)
            }
            for (const id of toDelete) this.players.delete(id)

            // Update positions based on heading and the time since we last updated it.
            if (this.lastUpdate) {
                const msSinceLastUpdate = Date.now() - this.lastUpdate
                for (const entity of this.entities.values()) {
                    if (!entity.moving) continue
                    let justUpdated = false
                    for (const entity2 of data.monsters) {
                        // Don't update the movements for those that were just updated
                        if (entity.id == entity2.id) {
                            justUpdated = true
                            break
                        }
                    }
                    if (justUpdated) continue
                    const distanceTravelled = entity.speed * msSinceLastUpdate / 1000
                    const angle = Math.atan2(entity.going_y - entity.y, entity.going_x - entity.x)
                    const distanceToGoal = Tools.distance({ x: entity.x, y: entity.y }, { x: entity.going_x, y: entity.going_y })
                    if (distanceTravelled > distanceToGoal) {
                        entity.moving = false
                        entity.x = entity.going_x
                        entity.y = entity.going_y
                    } else {
                        entity.x = entity.x + Math.cos(angle) * distanceTravelled
                        entity.y = entity.y + Math.sin(angle) * distanceTravelled
                    }
                }
                for (const player of this.players.values()) {
                    if (!player.moving) continue
                    let justUpdated = false
                    for (const entity2 of data.players) {
                        // Don't update the movements for those that were just updated
                        if (player.id == entity2.id) {
                            justUpdated = true
                            break
                        }
                    }
                    if (justUpdated) continue
                    const distanceTravelled = player.speed * msSinceLastUpdate / 1000
                    const angle = Math.atan2(player.going_y - player.y, player.going_x - player.x)
                    const distanceToGoal = Tools.distance({ x: player.x, y: player.y }, { x: player.going_x, y: player.going_y })
                    if (distanceTravelled > distanceToGoal) {
                        player.moving = false
                        player.x = player.going_x
                        player.y = player.going_y
                    } else {
                        player.x = player.x + Math.cos(angle) * distanceTravelled
                        player.y = player.y + Math.sin(angle) * distanceTravelled
                    }
                }
            }
            this.lastUpdate = Date.now()
        }

        for (const monster of data.monsters) {
            if (!this.entities.has(monster.id)) {
                // Set soft properties
                if (monster["max_hp"] === undefined) monster["max_hp"] = this.G.monsters[monster.type]["hp"]
                if (monster["max_mp"] === undefined) monster["max_mp"] = this.G.monsters[monster.type]["mp"]
                for (const attribute of ["attack", "hp", "mp", "speed"]) {
                    if (monster[attribute] === undefined) monster[attribute] = this.G.monsters[monster.type][attribute]
                }

                // Set everything else
                this.entities.set(monster.id, monster)
            } else {
                // Update everything
                const entity = this.entities.get(monster.id)
                for (const attr in monster) entity[attr] = monster[attr]
            }
        }
        for (const player of data.players) {
            if (player.id == this.character?.id) continue // Skip our own character (it gets sent in 'start')
            this.players.set(player.id, player)
        }
    }

    private parseGameResponse(data: GameResponseData) {
        if (typeof data == "string") {
            console.info(`Game Response: ${data}`)
        } else {
            console.info(`Game Response: ${data.response}`)
        }
    }

    private prepare() {
        this.socket.on("achievement_progress", (data: AchievementProgressData) => {
            this.achievements.set(data.name, data)
            console.log(data)
        })

        this.socket.on("action", (data: ActionData) => {
            this.projectiles.set(data.pid, { ...data, date: new Date() })
        })

        // on("connect")

        this.socket.on("chest_opened", (data: ChestOpenedData) => {
            this.chests.delete(data.id)
        })

        this.socket.on("death", (data: DeathData) => {
            this.entities.delete(data.id)
            // TODO: Does this get called for players, too? Players turn in to grave stones...
        })

        this.socket.on("disappear", (data: DisappearData) => {
            this.players.delete(data.id)
        })

        this.socket.on("disconnect", () => {
            this.disconnect()
        })

        this.socket.on("drop", (data: ChestData) => {
            this.chests.set(data.id, data)
        })

        this.socket.on("entities", (data: EntitiesData) => {
            this.parseEntities(data)
        })

        this.socket.on("eval", (data: EvalData) => {
            // Skill timeouts (like attack) are sent via eval
            const skillReg = /skill_timeout\s*\(\s*['"](.+?)['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.exec(data.code)
            if (skillReg) {
                const skill = skillReg[1] as SkillName
                const cooldown = Number.parseFloat(skillReg[2])
                this.nextSkill.set(skill, new Date(Date.now() + Math.ceil(cooldown)))
                return
            }

            // Potion timeouts are sent via eval
            const potReg = /pot_timeout\s*\(\s*(\d+\.?\d+?)\s*\)/.exec(data.code)
            if (potReg) {
                const cooldown = Number.parseFloat(potReg[1])
                this.nextSkill.set("use_hp", new Date(Date.now() + Math.ceil(cooldown)))
                this.nextSkill.set("use_mp", new Date(Date.now() + Math.ceil(cooldown)))
                return
            }
        })

        // TODO: Figure out type. I think it's just a string?
        this.socket.on("game_error", (data: any) => {
            console.error(`Game Error: ${data}`)
            this.disconnect()
        })

        this.socket.on("game_response", (data: GameResponseData) => {
            this.parseGameResponse(data)
        })

        this.socket.on("hit", (data: HitData) => {
            // console.log("socket: hit!")
            // console.log(data)
            if (data.miss || data.evade) {
                this.projectiles.delete(data.pid)
                return
            }

            if (data.reflect) {
                // TODO: Reflect!
                this.projectiles.get(data.pid)
            }

            if (data.kill == true) {
                this.projectiles.delete(data.pid)
                this.entities.delete(data.id)
            } else if (data.damage) {
                const entity = this.entities.get(data.id)
                if (entity) {
                    entity.hp = entity.hp - data.damage
                    this.entities.set(data.id, entity)
                }
            }
        })

        this.socket.on("new_map", (data: NewMapData) => {
            this.projectiles.clear()

            this.parseEntities(data.entities)

            this.character.x = data.x
            this.character.y = data.y
            this.character.in = data.in
            this.character.map = data.map
        })

        this.socket.on("party_update", (data: PartyData) => {
            this.party = data
        })

        this.socket.on("player", (data: CharacterData) => {
            this.parseCharacter(data)
            if (data.hitchhikers) {
                for (const hitchhiker of data.hitchhikers) {
                    if (hitchhiker[0] == "game_response") {
                        this.parseGameResponse(hitchhiker[1])
                    }
                }
            }
        })

        // this.socket.on("q_data", (data: QData) => {

        // })

        this.socket.on("start", (data: StartData) => {
            console.log("socket: start!")
            console.log(data)
            this.parseCharacter(data)
            this.parseEntities(data.entities)
        })

        this.socket.on("welcome", (data: WelcomeData) => {
            console.log("socket: welcome!")
            this.server = data

            // Send a response that we're ready to go
            console.log("socket: loaded...")
            this.socket.emit("loaded", {
                height: 1080,
                width: 1920,
                scale: 2,
                success: 1
            } as LoadedData)
        })

        console.log("Prepared!")
    }

    async connect(auth: string, character: string, user: string): Promise<unknown> {
        await Promise.all(this.promises)

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

        this.active = true

        return new Promise((resolve, reject) => {
            this.socket.once("start", () => {
                resolve()
            })
            setTimeout(() => {
                reject("start timeout (10000ms)")
            }, 10000)
        })
    }

    disconnect(): void {
        this.active = false
        this.socket.close()
    }

    async getGameData(): Promise<GData> {
        console.log("Fetching http://adventure.land/data.js...")
        const result = await axios.get("http://adventure.land/data.js")
        if (result.status == 200) {
            // Update G with the latest data
            const matches = result.data.match(/var\s+G\s*=\s*(\{.+\});/)
            return JSON.parse(matches[1]) as GData
        } else {
            console.error("Error fetching http://adventure.land/data.js")
        }
    }

    async getServerList(): Promise<ServerData[]> {
        // Get a list of the servers available
        console.log("Fetching http://adventure.land...")
        const result = await axios.get("http://adventure.land")
        if (result.status == 200) {
            // Use X.servers to get the server data
            const matches = result.data.match(/X\.servers=(\[.+\]);/)
            return JSON.parse(matches[1])
        } else {
            console.error("Error fetching http://adventure.land!")
        }
    }
}