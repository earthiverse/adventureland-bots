import axios from "axios"
import socketio from "socket.io-client"
import { AchievementProgressData, CharacterData, ServerData, CharacterListData, ActionData, ChestOpenedData, DeathData, DisappearData, ChestData, EntitiesData, EvalData, GameResponseData, HitData, NewMapData, PartyData, StartData, WelcomeData, LoadedData, EntityData, PlayerData, AuthData } from "./definitions/adventureland-server"
import { connect, disconnect } from "./database/database.js"
import { UserModel } from "./database/users/users.model.js"
import { IUserDocument } from "./database/users/users.types.js"
import { ServerRegion, ServerIdentifier, GData, SkillName, BankInfo, ConditionName } from "./definitions/adventureland"
import { Tools } from "./tools"

// TODO: Move to config file
const PING_EVERY_MS = 30000
const MAX_PINGS = 100

// Connect to the MongoDB database
connect()

class Player {
    protected userID: string
    protected userAuth: string
    protected characterID: string
    protected lastUpdate: number
    protected promises: Promise<boolean>[] = []
    protected pingNum = 1
    protected pingMap = new Map<string, number>()
    protected timeouts = new Map<string, ReturnType<typeof setTimeout>>()

    public G: GData
    public socket: SocketIOClient.Socket

    public achievements = new Map<string, AchievementProgressData>()
    public bank: BankInfo
    public character: CharacterData
    public chests = new Map<string, ChestData>()
    public entities = new Map<string, EntityData>()
    public nextSkill = new Map<SkillName, Date>()
    public party: PartyData
    public pings: number[] = []
    public players = new Map<string, PlayerData>()
    public projectiles = new Map<string, ActionData & { date: Date }>()
    public server: WelcomeData

    constructor(userID: string, userAuth: string, characterID: string, g: GData, wsURL: string) {
        this.userID = userID
        this.userAuth = userAuth
        this.characterID = characterID
        this.G = g

        this.socket = socketio(wsURL, {
            autoConnect: false,
            reconnection: false,
            transports: ["websocket"]
        })

        this.socket.on("achievement_progress", (data: AchievementProgressData) => {
            this.achievements.set(data.name, data)
            console.log(data)
        })

        this.socket.on("action", (data: ActionData) => {
            // TODO: do we need this 'date'?
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
            const skillReg1 = /skill_timeout\s*\(\s*['"](.+?)['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.exec(data.code)
            if (skillReg1) {
                const skill = skillReg1[1] as SkillName
                let cooldown: number
                if (skillReg1[2]) {
                    cooldown = Number.parseFloat(skillReg1[2])
                } else if (this.G.skills[skill].cooldown) {
                    cooldown = this.G.skills[skill].cooldown
                }
                this.setNextSkill(skill, new Date(Date.now() + Math.ceil(cooldown)))
                return
            }

            // Potion timeouts are sent via eval
            const potReg = /pot_timeout\s*\(\s*(\d+\.?\d+?)\s*\)/.exec(data.code)
            if (potReg) {
                const cooldown = Number.parseFloat(potReg[1])
                this.setNextSkill("use_hp", new Date(Date.now() + Math.ceil(cooldown)))
                this.setNextSkill("use_mp", new Date(Date.now() + Math.ceil(cooldown)))
                return
            }
        })

        this.socket.on("game_error", (data: string | { message: string }) => {
            if (typeof data == "string") {
                console.error(`Game Error: ${data}`)
            } else {
                console.error("Game Error ----------")
                console.error(data)
            }
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
                this.projectiles.delete(data.pid)
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

        // TODO: Confirm this works for leave_party(), too.
        this.socket.on("party_update", (data: PartyData) => {
            this.party = data
        })

        this.socket.on("ping_ack", (data: { id: string }) => {
            if (this.pingMap.has(data.id)) {
                // Add the new ping
                const ping = Date.now() - this.pingMap.get(data.id)
                this.pings.push(ping)
                console.log(`Ping: ${ping}`)

                // Remove the oldest ping
                if (this.pings.length > MAX_PINGS) this.pings.shift()

                // Remove the ping from the map
                this.pingMap.delete(data.id)
            }
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
    }

    protected parseCharacter(data: CharacterData) {
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

    protected parseEntities(data: EntitiesData): void {
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

    protected parseGameResponse(data: GameResponseData): void {
        // Adjust cooldowns
        if (typeof (data) == "object") {
            if (data.response == "cooldown") {
                // A skill is on cooldown
                const skill = data.skill
                if (skill) {
                    const cooldown = data.ms
                    this.setNextSkill(skill, new Date(Date.now() + Math.ceil(cooldown)))
                }
            } else if (data.response == "ex_condition") {
                // The condition expired
                delete this.character.s[data.name]

                // TODO: See if "buy_success" is called before our updated character is sent, and if it is, adjust our gold and items.

            } else {
                // DEBUG
                console.info("Game Response Data -----")
                console.info(data)
            }
        } else if (typeof (data) == "string") {
            // DEBUG
            console.info(`Game Response: ${data}`)
        }
    }

    protected setNextSkill(skill: SkillName, next: Date): void {
        this.nextSkill.set(skill, next)
    }

    public async connect() {
        // When we're loaded, authenticate
        this.socket.once("welcome", () => {
            console.log("socket: authenticating...")
            this.socket.emit("auth", {
                auth: this.userAuth,
                character: this.characterID,
                height: 1080,
                no_graphics: "True",
                no_html: "1",
                passphrase: "",
                scale: 2,
                user: this.userID,
                width: 1920
            } as AuthData)
        })

        this.socket.open()

        return new Promise((resolve, reject) => {
            this.socket.once("start", () => {
                resolve()
            })
            setTimeout(() => {
                reject("start timeout (10000ms)")
            }, 10000)
        })
    }

    public async disconnect(): Promise<void> {
        console.warn("Disconnecting!")
        this.socket.close()

        // Cancel all timeouts
        for (const timer of this.timeouts.values()) clearTimeout(timer)
    }

    // TODO: Convert to async, and return a promise<number> with the ping ms time
    public sendPing(): string {
        // Get the next pingID
        const pingID = this.pingNum.toString()
        this.pingNum++

        // Set the pingID in the map
        this.pingMap.set(pingID, Date.now())

        // Get the ping
        this.socket.emit("ping_trig", { id: pingID })
        return pingID
    }
}

export class Game2 {
    protected static user: IUserDocument
    // TODO: Move this type to type definitions
    protected static servers: { [T in ServerRegion]?: { [T in ServerIdentifier]?: ServerData } } = {}
    // TODO: Move this type to type definitions
    protected static characters: { [T in string]?: CharacterListData } = {}

    public static G: GData

    private constructor() {
        // Private to force static methods
    }

    static async login(email: string, password: string): Promise<boolean> {
        // See if we already have a loginAuth stored in our database
        const user = await UserModel.findOne({ email: email, password: password }).exec()

        if (user) {
            this.user = user
        } else {
            // Login and save the auth
            const login = await axios.post("https://adventure.land/api/signup_or_login", `method=signup_or_login&arguments={"email":"${email}","password":"${password}","only_login":true}`)
            let loginResult
            for (const datum of login.data) {
                if (datum.message) {
                    loginResult = datum
                    break
                }
            }
            if (loginResult && loginResult.message == "Logged In!") {
                // We successfully logged in
                // Find the auth cookie and save it
                for (const cookie of login.headers["set-cookie"]) {
                    const result = /^auth=(.+?);/.exec(cookie)
                    if (result) {
                        // Save our data to the database
                        this.user = await UserModel.findOneAndUpdate({ email: email, password: password }, { email: email, password: password, userID: result[1].split("-")[0], userAuth: result[1].split("-")[1] }, { upsert: true, new: true, lean: true }).exec()
                        console.log(this.user)
                        break
                    }
                }
            } else if (loginResult && loginResult.message) {
                // We failed logging in, and we have a reason from the server
                console.error(loginResult.message)
                return Promise.reject(loginResult.message)
            } else {
                // We failed logging in, but we don't know what went wrong
                console.error(login.data)
                return Promise.reject()
            }
        }

        return this.updateServersAndCharacters()
    }

    static async startCharacter(characterName: string, serverRegion: ServerRegion, serverID: ServerIdentifier): Promise<Player> {
        if (!this.user) return Promise.reject("You must login first.")
        if (!this.characters) await this.updateServersAndCharacters()

        // Get Server URL
        const wsURL = `ws://${this.servers[serverRegion][serverID].addr}:${this.servers[serverRegion][serverID].port}`
        const userID = this.user.userID
        const userAuth = this.user.userAuth
        const characterID = this.characters[characterName].id

        const player = new Player(userID, userAuth, characterID, Game2.G, wsURL)

        // TODO: Setup character

        return player
    }

    static async updateGData(): Promise<GData> {
        const response = await axios.get("http://adventure.land/data.js")
        if (response.status == 200) {
            // Update G with the latest data
            const matches = response.data.match(/var\s+G\s*=\s*(\{.+\});/)
            this.G = JSON.parse(matches[1]) as GData
            return this.G
        } else {
            console.error(response)
            console.error("Error fetching http://adventure.land/data.js")
        }
    }

    static async updateServersAndCharacters(): Promise<boolean> {
        const data = await axios.post("http://adventure.land/api/servers_and_characters", "method=servers_and_characters&arguments={}", { headers: { "cookie": `auth=${this.user.userID}-${this.user.userAuth}` } })

        if (data.status == 200) {
            // Populate server information
            for (const serverData of data.data[0].servers as ServerData[]) {
                if (!this.servers[serverData.region]) this.servers[serverData.region] = {}
                this.servers[serverData.region][serverData.name] = serverData
            }

            // Populate character information
            for (const characterData of data.data[0].characters as CharacterListData[]) {
                this.characters[characterData.name] = characterData
            }

            return Promise.resolve(true)
        } else {
            console.error(data)
        }

        return Promise.reject("Error fetching http://adventure.land/api/servers_and_characters")
    }
}

// TODO: compensate condition durations
export class PingCompensatedPlayer extends Player {
    async connect(): Promise<unknown> {
        const promise = super.connect()
        return promise.then(async () => { this.pingLoop() })
    }

    protected setNextSkill(skill: SkillName, next: Date): void {
        // Get ping compensation
        let pingCompensation = 0
        if (this.pings.length > 0) {
            pingCompensation = Math.min(...this.pings)
        }

        this.nextSkill.set(skill, new Date(next.getTime() - pingCompensation))
    }

    protected parseEntities(data: EntitiesData): void {
        super.parseEntities(data)

        const pingCompensation = Math.min(...this.pings) / 2

        for (const monster of data.monsters) {
            // Compensate position
            const entity = this.entities.get(monster.id)
            if (!entity || !entity.moving) continue
            const distanceTravelled = entity.speed * pingCompensation / 1000
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

            // Compensate conditions
            for (const condition in entity.s) {
                if (entity.s[condition as ConditionName].ms) {
                    entity.s[condition as ConditionName].ms -= pingCompensation
                }
            }
        }
        for (const player of data.players) {
            // Compensate position
            const entity = this.players.get(player.id)
            if (!entity || !entity.moving) continue
            const distanceTravelled = entity.speed * pingCompensation / 1000
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

            // Compensate conditions
            for (const condition in entity.s) {
                if (entity.s[condition as ConditionName].ms) {
                    entity.s[condition as ConditionName].ms -= pingCompensation
                }
            }
        }
    }

    public pingLoop(): void {
        if (this.socket.connected) {
            this.sendPing()
            this.timeouts.set("pingLoop", setTimeout(async () => { this.pingLoop() }, PING_EVERY_MS))
        }
    }
}