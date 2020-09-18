import axios from "axios"
import socketio from "socket.io-client"
import { AchievementProgressData, CharacterData, ServerData, CharacterListData, ActionData, ChestOpenedData, DeathData, DisappearData, ChestData, EntitiesData, EvalData, GameResponseData, HitData, NewMapData, PartyData, StartData, WelcomeData, LoadedData, EntityData, PlayerData, AuthData, DisappearingTextData, GameLogData, UIData, UpgradeData } from "./definitions/adventureland-server"
import { connect, disconnect } from "./database/database.js"
import { UserModel } from "./database/users/users.model.js"
import { IUserDocument } from "./database/users/users.types.js"
import { ServerRegion, ServerIdentifier, GData, SkillName, BankInfo, ConditionName, MapName, ItemInfo, ItemName, SlotType, MonsterName, CharacterType } from "./definitions/adventureland"
import { Tools } from "./tools.js"
import { CharacterModel } from "./database/characters/characters.model.js"
import { Pathfinder } from "./pathfinder.js"

// TODO: Move to config file
const MAX_PINGS = 100
const PING_EVERY_MS = 30000
const TIMEOUT = 1000

connect()

export class Observer {
    public socket: SocketIOClient.Socket

    protected serverRegion: ServerRegion
    protected serverIdentifier: ServerIdentifier
    protected map: MapName
    protected x: number
    protected y: number

    constructor(serverData: ServerData) {
        this.serverRegion = serverData.region
        this.serverIdentifier = serverData.name

        this.socket = socketio(`ws://${serverData.addr}:${serverData.port}`, {
            autoConnect: false,
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

        this.socket.on("entities", (data: EntitiesData) => {
            this.parseEntities(data)
        })

        this.socket.on("new_map", (data: NewMapData) => {
            this.map = data.name
            this.x = data.x
            this.y = data.y
            this.parseEntities(data.entities)
        })
    }

    protected async parseEntities(data: EntitiesData): Promise<void> {
        // Update all the players
        for (const player of data.players) {
            CharacterModel.findOneAndUpdate({ name: player.id }, {
                map: this.map,
                x: player.x,
                y: player.y,
                serverRegion: this.serverRegion,
                serverIdentifier: this.serverIdentifier,
                lastSeen: Date.now(),
                s: player.s
            }, { upsert: true, useFindAndModify: false }).exec()
        }

        // TODO: Update entities if they're special

        // TODO: Update NPCs if they walk around
    }

    public async connect(): Promise<unknown> {
        console.log("Connecting...")
        const connected = new Promise<unknown>((resolve, reject) => {
            this.socket.once("welcome", (data: WelcomeData) => {
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

export class Player extends Observer {
    protected userID: string
    protected userAuth: string
    protected characterID: string
    protected lastPositionUpdate: number
    protected promises: Promise<boolean>[] = []
    protected pingNum = 1
    protected pingMap = new Map<string, number>()
    protected timeouts = new Map<string, ReturnType<typeof setTimeout>>()

    public G: GData

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

    constructor(userID: string, userAuth: string, characterID: string, g: GData, serverData: ServerData) {
        super(serverData)
        this.userID = userID
        this.userAuth = userAuth
        this.characterID = characterID
        this.G = g

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
            // NOTE: We will try to automatically reconnect
            // this.disconnect()
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
            this.character.map = data.name
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
            // console.log("socket: start!")
            // console.log(data)
            this.parseCharacter(data)
            this.parseEntities(data.entities)
        })

        this.socket.on("welcome", (data: WelcomeData) => {
            // console.log("socket: welcome!")
            this.server = data

            // Send a response that we're ready to go
            // console.log("socket: loaded...")
            this.socket.emit("loaded", {
                height: 1080,
                width: 1920,
                scale: 2,
                success: 1
            } as LoadedData)
        })
    }

    protected parseCharacter(data: CharacterData): void {
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

    protected async parseEntities(data: EntitiesData): Promise<void> {
        super.parseEntities(data)

        if (data.type == "all") {
            // Erase all of the entities
            this.entities.clear()
            this.players.clear()
        } else if (this.character) {
            // Update all positions
            this.updatePositions()
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

    protected updatePositions(): void {
        if (this.lastPositionUpdate) {
            const msSinceLastUpdate = Date.now() - this.lastPositionUpdate

            // Update entities
            for (const entity of this.entities.values()) {
                if (!entity.moving) continue
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

            // Update players
            for (const player of this.players.values()) {
                if (!player.moving) continue
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

            // Update character
            if (this.character.moving) {
                const distanceTravelled = this.character.speed * msSinceLastUpdate / 1000
                const angle = Math.atan2(this.character.going_y - this.character.y, this.character.going_x - this.character.x)
                const distanceToGoal = Tools.distance({ x: this.character.x, y: this.character.y }, { x: this.character.going_x, y: this.character.going_y })
                if (distanceTravelled > distanceToGoal) {
                    this.character.moving = false
                    this.character.x = this.character.going_x
                    this.character.y = this.character.going_y
                } else {
                    this.character.x = this.character.x + Math.cos(angle) * distanceTravelled
                    this.character.y = this.character.y + Math.sin(angle) * distanceTravelled
                }
            }
        }

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

        this.lastPositionUpdate = Date.now()
    }

    public async connect(): Promise<unknown> {
        const connected = new Promise<unknown>((resolve, reject) => {
            const failCheck = (data: string | { message: string }) => {
                if (typeof data == "string") {
                    reject(`Failed to connect: ${data}`)
                } else {
                    reject(`Failed to connect: ${data.message}`)
                }
            }

            const startCheck = () => {
                resolve()
            }


            setTimeout(() => {
                this.socket.removeListener("start", startCheck)
                this.socket.removeListener("game_error", failCheck)
                reject("Failed to start within 10s.")
            }, 10000)

            this.socket.once("start", startCheck)
            this.socket.once("game_error", failCheck)
        })

        // When we're loaded, authenticate
        this.socket.once("welcome", () => {
            // console.log("socket: authenticating...")
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

        return connected
    }

    public async disconnect(): Promise<void> {
        if (this.socket.disconnected) return
        console.warn("Disconnecting!")

        // Close the socket
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

    // // TODO: Not finished
    // public acceptMagiport(): Promise<unknown> {
    //     const acceptedMagiport = new Promise((resolve, reject) => {

    //         setTimeout(() => {
    //             reject(`acceptMagiport timeout (${TIMEOUT}ms)`)
    //         }, TIMEOUT)
    //     })

    //     parent.socket.emit("magiport", { name: name })
    //     return acceptedMagiport
    // }

    /**
     * Accepts another character's party invite.
     * @param id The ID of the character's party you want to accept the invite for.
     */
    public acceptPartyInvite(id: string): Promise<PartyData> {
        const acceptedInvite = new Promise<PartyData>((resolve, reject) => {
            const partyCheck = (data: PartyData) => {
                if (data.list.includes(this.character.id)
                    && data.list.includes(id)) {
                    this.socket.removeListener("party_update", partyCheck)
                    this.socket.removeListener("game_log", unableCheck)
                    resolve(data)
                }
            }

            const unableCheck = (data: GameLogData) => {
                const notFound = RegExp("^.+? is not found$")
                if (data == "Invitation expired") {
                    this.socket.removeListener("party_update", partyCheck)
                    this.socket.removeListener("game_log", unableCheck)
                    reject(data)
                } else if (notFound.test(data)) {
                    this.socket.removeListener("party_update", partyCheck)
                    this.socket.removeListener("game_log", unableCheck)
                    reject(data)
                } else if (data == "Already partying") {
                    if (this.party.list.includes(this.character.id)
                        && this.party.list.includes(id)) {
                        // NOTE: We resolve the promise even if we have already accepted it if we're in the correct party.
                        this.socket.removeListener("party_update", partyCheck)
                        this.socket.removeListener("game_log", unableCheck)
                        resolve(this.party)
                    } else {
                        this.socket.removeListener("party_update", partyCheck)
                        this.socket.removeListener("game_log", unableCheck)
                        reject(data)
                    }
                }
            }

            setTimeout(() => {
                this.socket.removeListener("party_update", partyCheck)
                this.socket.removeListener("game_log", unableCheck)
                reject(`acceptPartyInvite timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("party_update", partyCheck)
            this.socket.on("game_log", unableCheck)
        })

        this.socket.emit("party", { event: "accept", name: id })
        return acceptedInvite
    }

    // TODO: Add failure checks
    public acceptPartyRequest(id: string): Promise<PartyData> {
        const acceptedRequest = new Promise<PartyData>((resolve, reject) => {
            const partyCheck = (data: PartyData) => {
                if (data.list.includes(this.character.id)
                    && data.list.includes(id)) {
                    this.socket.removeListener("party_update", partyCheck)
                    resolve(data)
                }
            }

            setTimeout(() => {
                this.socket.removeListener("party_update", partyCheck)
                reject(`acceptPartyRequest timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("party_update", partyCheck)
        })

        this.socket.emit("party", { event: "raccept", name: id })
        return acceptedRequest
    }

    // TODO: Add 'notthere' (e.g. calling attack("12345") returns ["notthere", {place: "attack"}])
    // TODO: Check if cooldown is sent after attack
    public attack(id: string): Promise<string> {
        const attackStarted = new Promise<string>((resolve, reject) => {
            const deathCheck = (data: DeathData) => {
                if (data.id == id) {
                    this.socket.removeListener("action", attackCheck)
                    this.socket.removeListener("game_response", failCheck)
                    this.socket.removeListener("death", deathCheck)
                    reject(`Entity ${id} not found`)
                }
            }
            const failCheck = (data: GameResponseData) => {
                if (typeof data == "object") {
                    if (data.response == "disabled") {
                        this.socket.removeListener("action", attackCheck)
                        this.socket.removeListener("game_response", failCheck)
                        this.socket.removeListener("death", deathCheck)
                        reject(`Attack on ${id} failed (disabled).`)
                    } else if (data.response == "attack_failed" && data.id == id) {
                        this.socket.removeListener("action", attackCheck)
                        this.socket.removeListener("game_response", failCheck)
                        this.socket.removeListener("death", deathCheck)
                        reject(`Attack on ${id} failed.`)
                    } else if (data.response == "too_far" && data.id == id) {
                        this.socket.removeListener("action", attackCheck)
                        this.socket.removeListener("game_response", failCheck)
                        this.socket.removeListener("death", deathCheck)
                        reject(`${id} is too far away to attack (dist: ${data.dist}).`)
                    } else if (data.response == "cooldown" && data.id == id) {
                        this.socket.removeListener("action", attackCheck)
                        this.socket.removeListener("game_response", failCheck)
                        this.socket.removeListener("death", deathCheck)
                        reject(`Attack on ${id} failed due to cooldown (ms: ${data.ms}).`)
                    }
                }
            }
            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.character.id && data.target == id && data.type == "attack") {
                    this.socket.removeListener("action", attackCheck)
                    this.socket.removeListener("game_response", failCheck)
                    this.socket.removeListener("death", deathCheck)
                    resolve(data.pid)
                }
            }
            setTimeout(() => {
                this.socket.removeListener("action", attackCheck)
                this.socket.removeListener("game_response", failCheck)
                this.socket.removeListener("death", deathCheck)
                reject(`attack timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("action", attackCheck)
            this.socket.on("game_response", failCheck)
            this.socket.on("death", deathCheck)
        })

        this.socket.emit("attack", { id: id })
        return attackStarted
    }

    // TODO: Return buy info
    public buy(itemName: ItemName, quantity = 1): Promise<unknown> {
        if (this.character.gold < this.G.items[itemName].gold) return Promise.reject(`Insufficient gold. We have ${this.character.gold}, but the item costs ${this.G.items[itemName].gold}`)

        const itemReceived = new Promise((resolve, reject) => {
            const buyCheck1 = (data: CharacterData) => {
                if (!data.hitchhikers) return
                for (const hitchhiker of data.hitchhikers) {
                    if (hitchhiker[0] == "game_response") {
                        const data: GameResponseData = hitchhiker[1]
                        if (typeof data == "object"
                            && data.response == "buy_success"
                            && data.name == itemName
                            && data.q == quantity) {
                            this.socket.removeListener("player", buyCheck1)
                            this.socket.removeListener("game_response", buyCheck2)
                            resolve()
                        }
                    }
                }
            }
            const buyCheck2 = (data: GameResponseData) => {
                if (data == "buy_cant_npc") {
                    this.socket.removeListener("player", buyCheck1)
                    this.socket.removeListener("game_response", buyCheck2)
                    reject(`Cannot buy ${quantity} ${itemName}(s) from an NPC`)
                } else if (data == "buy_cant_space") {
                    this.socket.removeListener("player", buyCheck1)
                    this.socket.removeListener("game_response", buyCheck2)
                    reject(`Not enough inventory space to buy ${quantity} ${itemName}(s)`)
                } else if (data == "buy_cost") {
                    this.socket.removeListener("player", buyCheck1)
                    this.socket.removeListener("game_response", buyCheck2)
                    reject(`Not enough gold to buy ${quantity} ${itemName}(s)`)
                }
            }
            setTimeout(() => {
                this.socket.removeListener("player", buyCheck1)
                this.socket.removeListener("game_response", buyCheck2)
                reject(`buy timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("player", buyCheck1)
            this.socket.on("game_response", buyCheck2)
        })

        if (this.G.items[itemName].s) {
            // Item is stackable
            this.socket.emit("buy", { name: itemName, quantity: quantity })
        } else {
            // Item is not stackable.
            this.socket.emit("buy", { name: itemName })
        }
        return itemReceived
    }

    // TODO: Return better compound info
    public compound(item1Pos: number, item2Pos: number, item3Pos: number, cscrollPos: number, offeringPos?: number): Promise<boolean> {
        const item1Info = this.character.items[item1Pos]
        const item2Info = this.character.items[item2Pos]
        const item3Info = this.character.items[item3Pos]
        const cscrollInfo = this.character.items[cscrollPos]
        if (!item1Info) return Promise.reject(`There is no item in inventory slot ${item1Pos} (item1).`)
        if (!item2Info) return Promise.reject(`There is no item in inventory slot ${item2Pos} (item2).`)
        if (!item3Info) return Promise.reject(`There is no item in inventory slot ${item3Pos} (item3).`)
        if (!cscrollInfo) return Promise.reject(`There is no item in inventory slot ${cscrollPos} (cscroll).`)
        if (item1Info.name != item2Info.name || item1Info.name != item3Info.name) return Promise.reject("You can only combine 3 of the same items.")
        if (item1Info.level != item2Info.level || item1Info.level != item3Info.level) return Promise.reject("You can only combine 3 items of the same level.")

        const compoundComplete = new Promise<boolean>((resolve, reject) => {
            const completeCheck = (data: UpgradeData) => {
                if (data.type == "compound") {
                    this.socket.removeListener("upgrade", completeCheck)
                    this.socket.removeListener("game_response", bankCheck)
                    resolve(data.success == 1)
                }
            }
            const bankCheck = (data: GameResponseData) => {
                if (typeof data == "object" && data.response == "bank_restrictions" && data.place == "compound") {
                    this.socket.removeListener("upgrade", completeCheck)
                    this.socket.removeListener("game_response", bankCheck)
                    reject("You can't compound items in the bank.")
                }
            }
            setTimeout(() => {
                this.socket.removeListener("upgrade", completeCheck)
                this.socket.removeListener("game_response", bankCheck)
                reject("compound timeout (60000ms)")
            }, 60000)
            this.socket.on("upgrade", completeCheck)
            this.socket.on("game_response", bankCheck)
        })

        this.socket.emit("compound", {
            "items": [item1Pos, item2Pos, item3Pos],
            "scroll_num": cscrollPos,
            "clevel": 0
        })
        return compoundComplete
    }

    public equip(inventoryPos: number, equipSlot?: SlotType): Promise<unknown> {
        if (!this.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)

        const iInfo = this.character.items[inventoryPos]
        // const gInfo = this.game.G.items[iInfo.name]
        // const beforeSlots = this.game.character.slots

        const equipFinished = new Promise((resolve, reject) => {
            const equipCheck = (data: CharacterData) => {
                if (equipSlot) {
                    // Check the slot we equipped it to
                    const item = data.slots[equipSlot]
                    if (item.name == iInfo.name
                        && item.level == iInfo.level
                        && item.p == iInfo.p) {
                        this.socket.removeListener("player", equipCheck)
                        this.socket.removeListener("disappearing_text", cantEquipCheck)
                        resolve()
                    }
                } else {
                    // Look for the item in all of the slots
                    for (const slot in data.slots) {
                        const item = data.slots[slot as SlotType]
                        if (item.name == iInfo.name) {
                            this.socket.removeListener("player", equipCheck)
                            this.socket.removeListener("disappearing_text", cantEquipCheck)
                            resolve()
                        }
                    }
                }
            }
            const cantEquipCheck = (data: DisappearingTextData) => {
                if (data.id == this.character.id && data.message == "CAN'T EQUIP") {
                    this.socket.removeListener("player", equipCheck)
                    this.socket.removeListener("disappearing_text", cantEquipCheck)
                    reject(`Can't equip '${inventoryPos}' (${iInfo.name})`)
                }
            }
            setTimeout(() => {
                this.socket.removeListener("player", equipCheck)
                this.socket.removeListener("disappearing_text", cantEquipCheck)
                reject(`equip timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("player", equipCheck)
            this.socket.on("disappearing_text", cantEquipCheck)
        })

        this.socket.emit("equip", { num: inventoryPos, slot: equipSlot })
        return equipFinished
    }

    public exchange(inventoryPos: number): Promise<unknown> {
        if (!this.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)

        const exchangeFinished = new Promise((resolve, reject) => {
            const completeCheck = (data: UpgradeData) => {
                if (data.type == "exchange") {
                    this.socket.removeListener("upgrade", completeCheck)
                    this.socket.removeListener("game_response", bankCheck)
                    resolve(data.success == 1)
                }
            }
            const bankCheck = (data: GameResponseData) => {
                if (typeof data == "object" && data.response == "bank_restrictions" && data.place == "upgrade") {
                    this.socket.removeListener("upgrade", completeCheck)
                    this.socket.removeListener("game_response", bankCheck)
                    reject("You can't exchange items in the bank.")
                }
            }
            setTimeout(() => {
                this.socket.removeListener("upgrade", completeCheck)
                this.socket.removeListener("game_response", bankCheck)
                reject(`exchange timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("game_response", bankCheck)
            this.socket.on("upgrade", completeCheck)
        })

        this.socket.emit("exchange", { item_num: inventoryPos, q: this.character.items[inventoryPos]?.q })
        return exchangeFinished
    }

    public getMonsterHuntQuest(): Promise<unknown> {
        const questGot = new Promise((resolve, reject) => {
            const failCheck = (data: GameResponseData) => {
                if (data == "ecu_get_closer") {
                    this.socket.removeListener("game_response", failCheck)
                    this.socket.removeListener("player", successCheck)
                    reject("Too far away from Monster Hunt NPC.")
                } else if (data == "monsterhunt_merchant") {
                    this.socket.removeListener("game_response", failCheck)
                    this.socket.removeListener("player", successCheck)
                    reject("Merchants can't do Monster Hunts.")
                }
            }
            const successCheck = (data: CharacterData) => {
                if (!data.hitchhikers) return
                for (const hitchhiker of data.hitchhikers) {
                    if (hitchhiker[0] == "game_response" && hitchhiker[1] == "monsterhunt_started") {
                        this.socket.removeListener("game_response", failCheck)
                        this.socket.removeListener("player", successCheck)
                        resolve()
                        return
                    }
                }
            }
            setTimeout(() => {
                this.socket.removeListener("game_response", failCheck)
                this.socket.removeListener("player", successCheck)
                reject(`getMonsterHuntQuest timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("game_response", failCheck)
            this.socket.on("player", successCheck)
        })

        this.socket.emit("monsterhunt")
        return questGot
    }

    public getPontyItems(): Promise<ItemInfo[]> {
        const pontyItems = new Promise<ItemInfo[]>((resolve, reject) => {
            const distanceCheck = (data: GameResponseData) => {
                if (data == "buy_get_closer") {
                    this.socket.removeListener("game_response", distanceCheck)
                    this.socket.removeListener("secondhands", secondhandsItems)
                    reject("Too far away from secondhands NPC.")
                }
            }

            const secondhandsItems = (data: ItemInfo[]) => {
                this.socket.removeListener("game_response", distanceCheck)
                this.socket.removeListener("secondhands", secondhandsItems)
                resolve(data)
            }

            setTimeout(() => {
                this.socket.removeListener("game_response", distanceCheck)
                this.socket.removeListener("secondhands", secondhandsItems)
                reject(`getPontyItems timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("secondhands", secondhandsItems)
            this.socket.on("game_response", distanceCheck)
        })

        this.socket.emit("secondhands")
        return pontyItems
    }

    /**
     * For use on 'cyberland' and 'jail' to leave the map. You will be transported to the spawn on "main".
     */
    public leaveMap(): Promise<unknown> {
        const leaveComplete = new Promise((resolve, reject) => {
            this.socket.once("new_map", (data: NewMapData) => {
                if (data.name == "main") resolve()
                else reject(`We are now in ${data.name}, but we should be in main`)
            })

            setTimeout(() => {
                reject(`leaveMap timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
        })

        this.socket.emit("leave")
        return leaveComplete
    }

    // TODO: Add promises
    public leaveParty() {
        this.socket.emit("party", { event: "leave" })
    }

    public async move(x: number, y: number): Promise<unknown> {
        // Check if we're already there
        if (this.character.x == x && this.character.y == y) return Promise.resolve()

        const safeTo = await Pathfinder.getSafeWalkTo(
            { map: this.character.map, x: this.character.x, y: this.character.y },
            { map: this.character.map, x, y })
        if (safeTo.x !== x || safeTo.y !== y) {
            console.warn(`move: We can't move to {x: ${x}, y: ${y}} safely. We will move to {x: ${safeTo.x}, y: ${safeTo.y}.}`)
        }

        const moveFinished = new Promise((resolve, reject) => {
            const distance = Tools.distance(this.character, { x: safeTo.x, y: safeTo.y })
            let timeout: NodeJS.Timeout

            const positionCheck = () => {
                // Force an update of the character position
                this.updatePositions()

                if (this.character.x == x && this.character.y == y) {
                    this.socket.removeListener("player", moveFinishedCheck)
                    resolve()
                    return
                } else if (this.character.going_x !== safeTo.x || this.character.going_y !== safeTo.y) {
                    this.socket.removeListener("player", moveFinishedCheck)
                    reject(`We are not moving to the correct position. Expected ${safeTo.x},${safeTo.y}, but we are moving to ${this.character.going_x},${this.character.going_y}.`)
                    return
                } else {
                    // Check again later
                    timeout = setTimeout(positionCheck, 1 + Tools.distance(this.character, { x: safeTo.x, y: safeTo.y }) * 1000 / this.character.speed)
                }
            }
            timeout = setTimeout(positionCheck, 1 + distance * 1000 / this.character.speed)

            const moveFinishedCheck = (data: CharacterData) => {
                if (data.moving) return
                if (data.x == safeTo.x && data.y == safeTo.y) {
                    this.socket.removeListener("player", moveFinishedCheck)
                    clearTimeout(timeout)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("player", moveFinishedCheck)
                clearTimeout(timeout)
                reject(`move timeout (${TIMEOUT + 1 + distance * 1000 / this.character.speed}ms)`)
            }, (TIMEOUT + 1 + distance * 1000 / this.character.speed))
            this.socket.on("player", moveFinishedCheck)
        })

        this.socket.emit("move", {
            x: this.character.x,
            y: this.character.y,
            going_x: safeTo.x,
            going_y: safeTo.y,
            m: this.character.m
        })
        return moveFinished
    }

    public regenHP(): Promise<unknown> {
        const regenReceived = new Promise((resolve, reject) => {
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.socket.removeListener("eval", regenCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.socket.removeListener("eval", regenCheck)
                reject(`regenHP timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", regenCheck)
        })

        this.socket.emit("use", { item: "hp" })
        return regenReceived
    }

    public regenMP(): Promise<unknown> {
        // if (this.game.nextSkill.get("use_mp")?.getTime() > Date.now()) return Promise.reject("use_mp is on cooldown")

        const regenReceived = new Promise((resolve, reject) => {
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.socket.removeListener("eval", regenCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.socket.removeListener("eval", regenCheck)
                reject(`regenMP timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", regenCheck)
        })

        this.socket.emit("use", { item: "mp" })
        return regenReceived
    }

    public scare(): Promise<string[]> {
        const scared = new Promise<string[]>((resolve, reject) => {
            // TODO: Move this typescript to a definition
            let ids: string[]
            const idsCheck = (data: UIData) => {
                if (data.type == "scare") {
                    ids = data.ids
                    this.socket.removeListener("ui", idsCheck)
                }
            }

            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]scare['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("ui", idsCheck)
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve(ids)
                }
            }

            setTimeout(() => {
                this.socket.removeListener("ui", idsCheck)
                this.socket.removeListener("eval", cooldownCheck)
                reject(`scare timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("ui", idsCheck)
            this.socket.on("eval", cooldownCheck)
        })

        this.socket.emit("skill", { name: "scare" })
        return scared
    }

    // TODO: See what socket events happen, and see if we can see if the server picked up our request
    public sendGold(to: string, amount: number) {
        this.socket.emit("send", { name: to, gold: amount })
    }

    public sendItem(to: string, inventoryPos: number, quantity = 1): Promise<unknown> {
        if (!this.players.has(to)) return Promise.reject(`"${to}" is not nearby.`)
        if (!this.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)
        if (this.character.items[inventoryPos]?.q < quantity) return Promise.reject(`We only have a quantity of ${this.character.items[inventoryPos].q}, not ${quantity}.`)

        const item = this.character.items[inventoryPos]

        const itemSent = new Promise((resolve, reject) => {
            const sentCheck = (data: GameResponseData) => {
                if (data == "trade_get_closer") {
                    this.socket.removeListener("game_response", sentCheck)
                    reject(`sendItem failed, ${to} is too far away`)
                } else if (data == "send_no_space") {
                    this.socket.removeListener("game_response", sentCheck)
                    reject(`sendItem failed, ${to} has no inventory space`)
                } else if (typeof data == "object" && data.response == "item_sent" && data.name == to && data.item == item.name && data.q == quantity) {
                    this.socket.removeListener("game_response", sentCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("game_response", sentCheck)
                reject(`sendItem timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("game_response", sentCheck)
        })

        this.socket.emit("send", { name: to, num: inventoryPos, q: quantity })
        return itemSent
    }

    /**
     * Invites the given character to our party.
     * @param id The character ID to invite to our party.
     */
    // TODO: See what socket events happen, and see if we can see if the server picked up our request
    public sendPartyInvite(id: string) {
        this.socket.emit("party", { event: "invite", name: id })
    }

    /**
     * Requests to join another character's party.
     * @param id The character ID to request a party invite from.
     */
    // TODO: See what socket events happen, and see if we can see if the server picked up our request
    public sendPartyRequest(id: string) {
        this.socket.emit("party", { event: "request", name: id })
    }

    public transport(map: MapName, spawn: number): Promise<unknown> {
        const transportComplete = new Promise((resolve, reject) => {
            this.socket.once("new_map", (data: NewMapData) => {
                if (data.name == map) resolve()
                else reject(`We are now in ${data.name}, but we should be in ${map}`)
            })

            setTimeout(() => {
                reject(`transport timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
        })

        this.socket.emit("transport", { to: map, s: spawn })
        return transportComplete
    }

    public unequip(slot: SlotType): Promise<unknown> {
        if (this.character.slots[slot] === null) return Promise.reject(`Slot ${slot} is empty; nothing to unequip.`)
        if (this.character.slots[slot] === undefined) return Promise.reject(`Slot ${slot} does not exist.`)

        const unequipped = new Promise((resolve, reject) => {
            const unequipCheck = (data: CharacterData) => {
                if (data.slots[slot] === null) {
                    this.socket.removeListener("player", unequipCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.socket.removeListener("player", unequipCheck)
                reject(`unequip timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
        })

        this.socket.emit("unequip", { slot: slot })
        return unequipped
    }

    public upgrade(itemPos: number, scrollPos: number): Promise<boolean> {
        if (!this.character.items[itemPos]) return Promise.reject(`There is no item in inventory slot ${itemPos}.`)
        if (!this.character.items[scrollPos]) return Promise.reject(`There is no scroll in inventory slot ${scrollPos}.`)

        const upgradeComplete = new Promise<boolean>((resolve, reject) => {
            const completeCheck = (data: UpgradeData) => {
                if (data.type == "upgrade") {
                    this.socket.removeListener("upgrade", completeCheck)
                    this.socket.removeListener("game_response", bankCheck)
                    resolve(data.success == 1)
                }
            }
            const bankCheck = (data: GameResponseData) => {
                if (typeof data == "object" && data.response == "bank_restrictions" && data.place == "upgrade") {
                    this.socket.removeListener("upgrade", completeCheck)
                    this.socket.removeListener("game_response", bankCheck)
                    reject("You can't upgrade items in the bank.")
                }
            }
            setTimeout(() => {
                this.socket.removeListener("upgrade", completeCheck)
                this.socket.removeListener("game_response", bankCheck)
                reject("upgrade timeout (60000ms)")
            }, 60000)
            this.socket.on("upgrade", completeCheck)
            this.socket.on("game_response", bankCheck)
        })

        this.socket.emit("upgrade", { item_num: itemPos, scroll_num: scrollPos, clevel: this.character.items[itemPos].level })
        return upgradeComplete
    }

    // TODO: Check if it's an HP Pot
    public useHPPot(itemPos: number): Promise<unknown> {
        if (!this.character.items[itemPos]) return Promise.reject(`There is no item in inventory slot ${itemPos}.`)

        const healReceived = new Promise((resolve, reject) => {
            const healCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.socket.removeListener("eval", healCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.socket.removeListener("eval", healCheck)
                reject(`useHPPot timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", healCheck)
        })

        this.socket.emit("equip", { num: itemPos })
        return healReceived
    }

    // TODO: Check if it's an MP Pot
    public useMPPot(itemPos: number): Promise<unknown> {
        if (!this.character.items[itemPos]) return Promise.reject(`There is no item in inventory slot ${itemPos}.`)

        const healReceived = new Promise((resolve, reject) => {
            const healCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.socket.removeListener("eval", healCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.socket.removeListener("eval", healCheck)
                reject(`useMPPot timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", healCheck)
        })

        this.socket.emit("equip", { num: itemPos })
        return healReceived
    }

    public warpToTown(): Promise<unknown> {
        const currentMap = this.character.map
        const warpComplete = new Promise((resolve, reject) => {
            this.socket.once("new_map", (data: NewMapData) => {
                if (currentMap == data.name) resolve()
                else reject(`We are now in ${data.name}, but we should be in ${currentMap}`)
            })

            setTimeout(() => {
                reject(`warpToTown timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
        })

        this.socket.emit("town")
        return warpComplete
    }

    /**
     * Returns the number of items that match the given parameters
     * @param itemName The item to look for
     * @param inventory Where to look for the item
     * @param filters Filters to help search for specific properties on items
     */
    public countItem(item: ItemName, inventory = this.character.items,
        args?: {
            levelGreaterThan?: number,
            levelLessThan?: number
        }): number {
        let count = 0
        for (const inventoryItem of inventory) {
            if (!inventoryItem) continue
            if (inventoryItem.name !== item) continue

            if (args) {
                if (args.levelGreaterThan) {
                    if (!inventoryItem.level) continue // This item doesn't have a level
                    if (inventoryItem.level <= args.levelGreaterThan) continue // This item is a lower level than desired
                }
                if (args.levelLessThan) {
                    if (!inventoryItem.level) continue // This item doesn't have a level
                    if (inventoryItem.level >= args.levelLessThan) continue // This item is a higher level than desired
                }
            }

            // We have the item!
            if (inventoryItem.q) {
                count += inventoryItem.q
            } else {
                count += 1
            }
        }

        return count
    }

    public getCooldown(skill: SkillName): number {
        // Check if this skill is shared with another cooldown
        if (this.G.skills[skill].share) skill = this.G.skills[skill].share

        const nextSkill = this.nextSkill.get(skill)
        if (!nextSkill) return 0

        const cooldown = nextSkill.getTime() - Date.now()
        if (cooldown < 0) return 0
        return cooldown
    }

    public getNearestMonster(mtype?: MonsterName): { monster: EntityData, distance: number } {
        let closest: EntityData
        let closestD = Number.MAX_VALUE
        this.entities.forEach((entity) => {
            if (mtype && entity.type != mtype) return
            const d = Tools.distance(this.character, entity)
            if (d < closestD) {
                closest = entity
                closestD = d
            }
        })
        if (closest) return { monster: closest, distance: closestD }
    }

    public getNearestAttackablePlayer(): { player: PlayerData, distance: number } {
        let closest: PlayerData
        let closestD = Number.MAX_VALUE
        this.players.forEach((player) => {
            if (player.s?.invincible) return
            if (player.npc) return
            const d = Tools.distance(this.character, player)
            if (d < closestD) {
                closest = player
                closestD = d
            }
        })
        if (closest) return ({ player: closest, distance: closestD })
    }

    /**
     * Returns a boolean corresponding to whether or not the item is in our inventory.
     * @param itemName The item to look for
     * @param inventory Where to look for the item
     */
    public hasItem(itemName: ItemName, inventory = this.character.items): boolean {
        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i]
            if (!item) continue

            if (item.name == itemName) return true
        }
        return false
    }

    /**
     * Returns a boolean corresponding to whether or not we have a given item equipped.
     * @param itemName The item to look for
     */
    public isEquipped(itemName: ItemName): boolean {
        for (const slot in this.character.slots) {
            if (!this.character.slots[slot as SlotType]) continue // Nothing equipped in this slot
            if (this.character.slots[slot as SlotType].name == itemName) return true
        }
        return false
    }

    /**
     * Returns a boolean corresponding to whether or not we can attack other players
     */
    public isPVP(): boolean {
        if (this.G[this.character.map].pvp) return true
        return this.server.pvp
    }

    /**
     * Returns the index of the item in the given inventory
     * @param itemName The item to look for
     * @param inventory Where to look for the item
     * @param filters Filters to help search for specific properties on items
     */
    public locateItem(itemName: ItemName, inventory = this.character.items,
        filters?: {
            levelGreaterThan?: number,
            levelLessThan?: number
        }): number {
        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i]
            if (!item) continue

            if (filters) {
                if (filters.levelGreaterThan) {
                    if (!item.level) continue // This item doesn't have a level
                    if (item.level <= filters.levelGreaterThan) continue // This item is a lower level than desired
                }
                if (filters.levelLessThan) {
                    if (!item.level) continue // This item doesn't have a level
                    if (item.level >= filters.levelLessThan) continue // This item is a higher level than desired
                }
            }

            if (item.name == itemName) {
                return i
            }
        }
        return undefined
    }

    /**
     * Returns a list of indexes of the items in the given inventory
     * @param itemName The item to look for
     * @param inventory Where to look for the item
     * @param filters Filters to help search for specific properties on items
     */
    public locateItems(itemName: ItemName, inventory = this.character.items,
        filters?: {
            levelGreaterThan?: number,
            levelLessThan?: number
        }): number[] {
        const found: number[] = []
        for (let i = 0; i < inventory.length; i++) {
            const item = inventory[i]
            if (!item) continue

            if (filters) {
                if (filters.levelGreaterThan) {
                    if (!item.level) continue // This item doesn't have a level
                    if (item.level <= filters.levelGreaterThan) continue // This item is a lower level than desired
                }
                if (filters.levelLessThan) {
                    if (!item.level) continue // This item doesn't have a level
                    if (item.level >= filters.levelLessThan) continue // This item is a higher level than desired
                }
            }

            if (item.name == itemName) {
                found.push(i)
            }
        }
        return found
    }
}


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

    protected async parseEntities(data: EntitiesData): Promise<void> {
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

    protected parseCharacter(data: CharacterData): void {
        super.parseCharacter(data)

        const pingCompensation = Math.min(...this.pings) / 2

        // Compensate movement
        if (this.character.moving) {
            const distanceTravelled = this.character.speed * pingCompensation / 1000
            const angle = Math.atan2(this.character.going_y - this.character.y, this.character.going_x - this.character.x)
            const distanceToGoal = Tools.distance({ x: this.character.x, y: this.character.y }, { x: this.character.going_x, y: this.character.going_y })
            if (distanceTravelled > distanceToGoal) {
                this.character.moving = false
                this.character.x = this.character.going_x
                this.character.y = this.character.going_y
            } else {
                this.character.x = this.character.x + Math.cos(angle) * distanceTravelled
                this.character.y = this.character.y + Math.sin(angle) * distanceTravelled
            }
        }

        // Compensate conditions
        for (const condition in this.character.s) {
            if (this.character.s[condition as ConditionName].ms) {
                this.character.s[condition as ConditionName].ms -= pingCompensation
            }
        }
    }

    protected pingLoop(): void {
        if (this.socket.connected) {
            this.sendPing()
            if (this.pings.length > MAX_PINGS / 10) {
                this.timeouts.set("pingLoop", setTimeout(async () => { this.pingLoop() }, PING_EVERY_MS))
            } else {
                this.timeouts.set("pingLoop", setTimeout(async () => { this.pingLoop() }, 1000))
            }
        }
    }
}

export class Mage extends PingCompensatedPlayer {
    /**
     * 
     * @param targets Put in pairs of entity IDs, and how much mp to spend attacking each target. E.g.: [["12345", "100"]]
     */
    public cburst(targets: [string, number][]): Promise<unknown> {
        const cbursted = new Promise((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]cburst['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                reject(`cburst timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
        })

        this.socket.emit("skill", { name: "cburst", targets: targets })
        return cbursted
    }

    public energize(target: string): Promise<unknown> {
        const energized = new Promise((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]energize['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                reject(`energize timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
        })

        this.socket.emit("skill", { name: "energize", id: target })
        return energized
    }
}

export class Priest extends PingCompensatedPlayer {
    public heal(id: string): Promise<string> {
        // if (!this.game.entities.has(id) && !this.game.players.has(id)) return Promise.reject(`No Entity with ID '${id}'`)

        const healStarted = new Promise<string>((resolve, reject) => {
            const deathCheck = (data: DeathData) => {
                if (data.id == id) {
                    this.socket.removeListener("action", attackCheck)
                    this.socket.removeListener("game_response", failCheck)
                    this.socket.removeListener("death", deathCheck)
                    reject(`Entity ${id} not found`)
                }
            }
            const failCheck = (data: GameResponseData) => {
                if (typeof data == "object") {
                    if (data.response == "disabled") {
                        this.socket.removeListener("action", attackCheck)
                        this.socket.removeListener("game_response", failCheck)
                        this.socket.removeListener("death", deathCheck)
                        reject(`Heal on ${id} failed (disabled).`)
                    } else if (data.response == "attack_failed" && data.id == id) {
                        this.socket.removeListener("action", attackCheck)
                        this.socket.removeListener("game_response", failCheck)
                        this.socket.removeListener("death", deathCheck)
                        reject(`Heal on ${id} failed.`)
                    } else if (data.response == "too_far" && data.id == id) {
                        this.socket.removeListener("action", attackCheck)
                        this.socket.removeListener("game_response", failCheck)
                        this.socket.removeListener("death", deathCheck)
                        reject(`${id} is too far away to heal (dist: ${data.dist}).`)
                    } else if (data.response == "cooldown" && data.id == id) {
                        this.socket.removeListener("action", attackCheck)
                        this.socket.removeListener("game_response", failCheck)
                        this.socket.removeListener("death", deathCheck)
                        reject(`Heal on ${id} failed due to cooldown (ms: ${data.ms}).`)
                    }
                }
            }
            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.character.id && data.target == id && data.type == "heal") {
                    this.socket.removeListener("action", attackCheck)
                    this.socket.removeListener("game_response", failCheck)
                    this.socket.removeListener("death", deathCheck)
                    resolve(data.pid)
                }
            }
            setTimeout(() => {
                this.socket.removeListener("action", attackCheck)
                this.socket.removeListener("game_response", failCheck)
                this.socket.removeListener("death", deathCheck)
                reject(`heal timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("action", attackCheck)
            this.socket.on("game_response", failCheck)
            this.socket.on("death", deathCheck)
        })

        this.socket.emit("heal", { id: id })
        return healStarted
    }
}

/** Implement functions that only apply to rangers */
export class Ranger extends PingCompensatedPlayer {
    public fiveShot(target1: string, target2: string, target3: string, target4: string, target5: string): Promise<string[]> {
        const attackStarted = new Promise<string[]>((resolve, reject) => {
            const projectiles: string[] = []

            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.character.id
                    && data.type == "5shot"
                    && (data.target == target1 || data.target == target2 || data.target == target3 || data.target == target4 || data.target == target5)) {
                    projectiles.push(data.pid)
                }
            }

            // TODO: Confirm that the cooldown is always sent after the projectiles
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]5shot['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("action", attackCheck)
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve(projectiles)
                }
            }

            setTimeout(() => {
                this.socket.removeListener("action", attackCheck)
                this.socket.removeListener("eval", cooldownCheck)
                reject(`5shot timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("action", attackCheck)
            this.socket.on("eval", cooldownCheck)
        })

        this.socket.emit("skill", {
            name: "5shot",
            ids: [target1, target2, target3, target4, target5]
        })
        return attackStarted
    }

    public threeShot(target1: string, target2: string, target3: string): Promise<string[]> {
        const attackStarted = new Promise<string[]>((resolve, reject) => {
            const projectiles: string[] = []

            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.character.id
                    && data.type == "3shot"
                    && (data.target == target1 || data.target == target2 || data.target == target3)) {
                    projectiles.push(data.pid)
                }
            }

            // TODO: Confirm that the cooldown is always sent after the projectiles
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]3shot['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("action", attackCheck)
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve(projectiles)
                }
            }

            setTimeout(() => {
                this.socket.removeListener("action", attackCheck)
                this.socket.removeListener("eval", cooldownCheck)
                reject(`3shot timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("action", attackCheck)
            this.socket.on("eval", cooldownCheck)
        })

        this.socket.emit("skill", {
            name: "3shot",
            ids: [target1, target2, target3]
        })
        return attackStarted
    }
}

export class Warrior extends PingCompensatedPlayer {
    // TODO: Investigate why the cooldown check doesn't work.
    public agitate(): Promise<unknown> {
        const agitated = new Promise((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]agitate['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    this.socket.removeListener("game_response", failCheck)
                    resolve()
                }
            }

            const failCheck = (data: GameResponseData) => {
                if (typeof data == "object" && data.response == "cooldown" && data.skill == "agitate") {
                    this.socket.removeListener("eval", cooldownCheck)
                    this.socket.removeListener("game_response", failCheck)
                    reject(`Agitate failed due to cooldown (ms: ${data.ms}).`)
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                this.socket.removeListener("game_response", failCheck)
                reject(`agitate timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
            this.socket.on("game_response", failCheck)
        })

        this.socket.emit("skill", {
            name: "agitate"
        })
        return agitated
    }

    public hardshell(): Promise<unknown> {
        const hardshelled = new Promise((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]hardshell['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    this.socket.removeListener("game_response", failCheck)
                    resolve()
                }
            }

            const failCheck = (data: GameResponseData) => {
                if (typeof data == "object" && data.response == "cooldown" && data.skill == "hardshell") {
                    this.socket.removeListener("eval", cooldownCheck)
                    this.socket.removeListener("game_response", failCheck)
                    reject(`Hardshell failed due to cooldown (ms: ${data.ms}).`)
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                this.socket.removeListener("game_response", failCheck)
                reject(`hardshell timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
            this.socket.on("game_response", failCheck)
        })

        this.socket.emit("skill", {
            name: "hardshell"
        })
        return hardshelled
    }

    // TODO: Investigate if cooldown is before or after the "action" event. We are getting lots of "failed due to cooldowns"
    public taunt(target: string): Promise<string> {
        const tauntStarted = new Promise<string>((resolve, reject) => {
            const tauntCheck = (data: ActionData) => {
                if (data.attacker == this.character.id
                    && data.type == "taunt"
                    && data.target == target) {
                    resolve(data.pid)
                    this.socket.removeListener("action", tauntCheck)
                }
            }

            const failCheck = (data: GameResponseData) => {
                if (typeof data == "object") {
                    if (data.response == "no_target") {
                        this.socket.removeListener("action", tauntCheck)
                        this.socket.removeListener("game_response", failCheck)
                        reject(`Taunt on ${target} failed (no target).`)
                    } else if (data.response == "too_far" && data.id == target) {
                        this.socket.removeListener("action", tauntCheck)
                        this.socket.removeListener("game_response", failCheck)
                        reject(`${target} is too far away to taunt (dist: ${data.dist}).`)
                    } else if (data.response == "cooldown" && data.id == target) {
                        this.socket.removeListener("action", tauntCheck)
                        this.socket.removeListener("game_response", failCheck)
                        reject(`Taunt on ${target} failed due to cooldown (ms: ${data.ms}).`)
                    }
                }
            }

            setTimeout(() => {
                this.socket.removeListener("action", tauntCheck)
                this.socket.removeListener("game_response", failCheck)
                reject(`taunt timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("action", tauntCheck)
            this.socket.on("game_response", failCheck)
        })

        this.socket.emit("skill", { name: "taunt", id: target })
        return tauntStarted
    }
}

export class Game {
    protected static user: IUserDocument
    // TODO: Move this type to type definitions
    protected static servers: { [T in ServerRegion]?: { [T in ServerIdentifier]?: ServerData } } = {}
    // TODO: Move this type to type definitions
    protected static characters: { [T in string]?: CharacterListData } = {}

    public static players: { [T in string]: Player } = {}
    public static observers: { [T in string]: Observer } = {}

    public static G: GData

    private constructor() {
        // Private to force static methods
    }

    public static async disconnect(): Promise<void> {
        // Stop all characters
        this.stopAllCharacters()

        // Stop all observers
        this.stopAllObservers()

        // Disconnect from the databasee
        disconnect()
    }

    static async getGData(): Promise<GData> {
        if (this.G) return this.G

        console.log("Updating 'G' data...")
        const response = await axios.get("http://adventure.land/data.js")
        if (response.status == 200) {
            // Update G with the latest data
            const matches = response.data.match(/var\s+G\s*=\s*(\{.+\});/)
            this.G = JSON.parse(matches[1]) as GData
            console.log("  Updated 'G' data!")
            return this.G
        } else {
            console.error(response)
            console.error("Error fetching http://adventure.land/data.js")
        }
    }

    static async login(email: string, password: string): Promise<boolean> {
        // See if we already have a userAuth stored in our database
        const user = await UserModel.findOne({ email: email, password: password }).exec()

        if (user) {
            console.log("Using authentication from database...")
            this.user = user
        } else {
            // Login and save the auth
            console.log("Logging in...")
            const login = await axios.post("https://adventure.land/api/signup_or_login", `method=signup_or_login&arguments={"email":"${email}","password":"${password}","only_login":true}`)
            let loginResult
            for (const datum of login.data) {
                if (datum.message) {
                    loginResult = datum
                    break
                }
            }
            if (loginResult && loginResult.message == "Logged In!") {
                console.log("  Logged in!")
                // We successfully logged in
                // Find the auth cookie and save it
                for (const cookie of login.headers["set-cookie"]) {
                    const result = /^auth=(.+?);/.exec(cookie)
                    if (result) {
                        // Save our data to the database
                        this.user = await UserModel.findOneAndUpdate({ email: email }, { password: password, userID: result[1].split("-")[0], userAuth: result[1].split("-")[1] }, { upsert: true, new: true, lean: true, useFindAndModify: true }).exec()
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

    static async startCharacter(cName: string, sRegion: ServerRegion, sID: ServerIdentifier, cType?: CharacterType): Promise<PingCompensatedPlayer> {
        if (!this.user) return Promise.reject("You must login first.")
        if (!this.characters) await this.updateServersAndCharacters()
        if (!this.G) await this.getGData()

        const userID = this.user.userID
        const userAuth = this.user.userAuth
        const characterID = this.characters[cName].id

        try {
            // Create the player and connect
            let player: PingCompensatedPlayer
            if (cType == "mage") player = new Mage(userID, userAuth, characterID, Game.G, this.servers[sRegion][sID])
            else if (cType == "priest") player = new Priest(userID, userAuth, characterID, Game.G, this.servers[sRegion][sID])
            else if (cType == "ranger") player = new Ranger(userID, userAuth, characterID, Game.G, this.servers[sRegion][sID])
            else if (cType == "warrior") player = new Warrior(userID, userAuth, characterID, Game.G, this.servers[sRegion][sID])
            else player = new PingCompensatedPlayer(userID, userAuth, characterID, Game.G, this.servers[sRegion][sID])

            await player.connect()

            this.players[cName] = player
            return player
        } catch (e) {
            return Promise.reject(e)
        }
    }

    static async startMage(cName: string, sRegion: ServerRegion, sID: ServerIdentifier): Promise<Mage> {
        return await Game.startCharacter(cName, sRegion, sID, "mage") as Mage
    }

    static async startPriest(cName: string, sRegion: ServerRegion, sID: ServerIdentifier): Promise<Priest> {
        return await Game.startCharacter(cName, sRegion, sID, "priest") as Priest
    }

    static async startRanger(cName: string, sRegion: ServerRegion, sID: ServerIdentifier): Promise<Ranger> {
        return await Game.startCharacter(cName, sRegion, sID, "ranger") as Ranger
    }

    static async startWarrior(cName: string, sRegion: ServerRegion, sID: ServerIdentifier): Promise<Warrior> {
        return await Game.startCharacter(cName, sRegion, sID, "warrior") as Warrior
    }

    static async startObserver(region: ServerRegion, id: ServerIdentifier): Promise<Observer> {
        if (!this.user) return Promise.reject("You must login first.")

        try {
            const observer = new Observer(this.servers[region][id])
            await observer.connect()

            this.observers[this.servers[region][id].key] = observer
            return observer
        } catch (e) {
            return Promise.reject(e)
        }
    }

    static async stopAllCharacters(): Promise<void> {
        for (const characterName in this.players) this.stopCharacter(characterName)
    }

    static async stopAllObservers(): Promise<void> {
        for (const region in this.observers)
            for (const id in this.observers[region])
                this.stopObserver(region as ServerRegion, id as ServerIdentifier)
    }

    public static async stopCharacter(characterName: string): Promise<void> {
        this.players[characterName].disconnect()
        delete this.players[characterName]
    }

    public static async stopObserver(region: ServerRegion, id: ServerIdentifier): Promise<void> {
        this.observers[region][id].disconnect()
        delete this.players[region][id]
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