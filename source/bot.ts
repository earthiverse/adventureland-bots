import { Game } from "./game.js";
import { CharacterData, ActionData, NewMapData, EvalData, EntityData, GameResponseData, GameResponseBuySuccess, GameResponseDataObject, DeathData, GameResponseAttackFailed, GameResponseItemSent } from "./definitions/adventureland-server";
import { SkillName, MonsterName, ItemName } from "./definitions/adventureland";

const TIMEOUT = 5000

export class Bot {
    private game: Game

    constructor(game: Game) {
        this.game = game
    }

    public async attack(id: string) {
        if (!this.game.entities.has(id)) return Promise.reject(`No Entity with ID '${id}'`)

        const attackStarted = new Promise((resolve, reject) => {
            const deathCheck = (data: DeathData) => {
                if (data.id == id) {
                    this.game.socket.removeListener("action", attackCheck)
                    this.game.socket.removeListener("game_response", failCheck)
                    this.game.socket.removeListener("death", deathCheck)
                    reject(`Entity ${id} not found`)
                }
            }
            const failCheck = (data: GameResponseData) => {
                if ((data as GameResponseDataObject).response == "attack_failed") {
                    if ((data as GameResponseAttackFailed).id == id) {
                        this.game.socket.removeListener("action", attackCheck)
                        this.game.socket.removeListener("game_response", failCheck)
                        this.game.socket.removeListener("death", deathCheck)
                        reject(`Attack on ${id} failed.`)
                    }
                }
            }
            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.game.character.id) {
                    this.game.socket.removeListener("action", attackCheck)
                    this.game.socket.removeListener("game_response", failCheck)
                    this.game.socket.removeListener("death", deathCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("action", attackCheck)
                this.game.socket.removeListener("game_response", failCheck)
                this.game.socket.removeListener("death", deathCheck)
                reject(`Attack Timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("action", attackCheck)
            this.game.socket.on("game_response", failCheck)
            this.game.socket.on("death", deathCheck)
        })

        this.game.socket.emit("attack", { id: id })
        return attackStarted
    }

    public async buy(itemName: ItemName, quantity: number = 1) {
        const itemReceived = new Promise((resolve, reject) => {
            const buyCheck1 = (data: CharacterData) => {
                if (!data.hitchhikers) return
                for (let hitchhiker of data.hitchhikers) {
                    if (hitchhiker[0] == "game_response") {
                        let data: GameResponseData = hitchhiker[1]
                        if ((data as GameResponseDataObject).response == "buy_success"
                            && (data as GameResponseBuySuccess).name == itemName
                            && (data as GameResponseBuySuccess).q == quantity) {
                            this.game.socket.removeListener("player", buyCheck1)
                            this.game.socket.removeListener("game_response", buyCheck2)
                            resolve()
                        }
                    }
                }
            }
            const buyCheck2 = (data: GameResponseData) => {
                if (data = "buy_cant_npc") {
                    this.game.socket.removeListener("player", buyCheck1)
                    this.game.socket.removeListener("game_response", buyCheck2)
                    reject(`Cannot buy ${quantity} ${itemName}(s) from an NPC`)
                } else if (data == "buy_cant_space") {
                    this.game.socket.removeListener("player", buyCheck1)
                    this.game.socket.removeListener("game_response", buyCheck2)
                    reject(`Not enough inventory space to buy ${quantity} ${itemName}(s)`)
                } else if (data == "buy_cost") {
                    this.game.socket.removeListener("player", buyCheck1)
                    this.game.socket.removeListener("game_response", buyCheck2)
                    reject(`Not enough gold to buy ${quantity} ${itemName}(s)`)
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("player", buyCheck1)
                this.game.socket.removeListener("game_response", buyCheck2)
                reject(`Buy Timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("player", buyCheck1)
            this.game.socket.on("game_response", buyCheck2)
        })

        if (Game.G.items[itemName].s) {
            // Item is stackable
            this.game.socket.emit("buy", { name: itemName, quantity: quantity })
        } else {
            // Item is not stackable.
            this.game.socket.emit("buy", { name: itemName })
        }
        return itemReceived
    }

    public async move(x: number, y: number) {
        const moveFinished = new Promise((resolve, reject) => {
            const moveFinishedCheck = (data: CharacterData) => {
                // TODO: Improve this to check if we moved again, and if we did, reject()
                if (data.moving) return
                if (data.x == x && data.y == y) {
                    this.game.socket.removeListener("player", moveFinishedCheck)
                    resolve()
                }
            }
            const distance = Math.sqrt((this.game.character.x - x) ** 2 - (this.game.character.y - y) ** 2)
            setTimeout(() => {
                this.game.socket.removeListener("player", moveFinishedCheck)
                reject(`Move Timeout (${TIMEOUT + distance * 1000 / this.game.character.speed}ms)`)
            }, (TIMEOUT + distance * 1000 / this.game.character.speed))
            this.game.socket.on("player", moveFinishedCheck)
        })

        this.game.socket.emit("move", {
            x: this.game.character.x,
            y: this.game.character.y,
            going_x: x,
            going_y: y,
            m: this.game.character.m
        })
        return moveFinished
    }

    public async regenHP() {
        if (this.game.nextSkill.get("use_hp")?.getTime() > Date.now()) return Promise.reject("use_hp is on cooldown")

        const regenReceived = new Promise((resolve, reject) => {
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.game.socket.removeListener("eval", regenCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("eval", regenCheck)
                reject(`regenHP Timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("eval", regenCheck)
        })

        this.game.socket.emit("use", { item: "hp" })
        return regenReceived
    }

    public async regenMP() {
        if (this.game.nextSkill.get("use_mp")?.getTime() > Date.now()) return Promise.reject("use_mp is on cooldown")

        const regenReceived = new Promise((resolve, reject) => {
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.game.socket.removeListener("eval", regenCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("eval", regenCheck)
                reject(`regenMP Timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("eval", regenCheck)
        })

        this.game.socket.emit("use", { item: "mp" })
        return regenReceived
    }

    public async sendItem(to: string, slot: number, quantity: number = 1) {
        if (!this.game.players.has(to)) return Promise.reject(`"${to}" is not nearby.`)
        if (!this.game.character.items[slot]) return Promise.reject(`No item in inventory slot ${slot}.`)
        if (this.game.character.items[slot]?.q < quantity) return Promise.reject(`We only have a quantity of ${this.game.character.items[slot].q}, not ${quantity}.`)

        const item = this.game.character.items[slot]

        const itemSent = new Promise((resolve, reject) => {
            const sentCheck = (data: GameResponseData) => {
                if (data == "trade_get_closer") {
                    this.game.socket.removeListener("game_response", sentCheck)
                    reject(`sendItem failed, ${to} is too far away`)
                } else if (data == "trade_bspace") {
                    this.game.socket.removeListener("game_response", sentCheck)
                    reject(`sendItem failed, ${to} has no inventory space`)
                } else if ((data as GameResponseItemSent).response == "item_sent"
                    && (data as GameResponseItemSent).name == to
                    && (data as GameResponseItemSent).item == item.name
                    && (data as GameResponseItemSent).q == quantity) {
                    this.game.socket.removeListener("game_response", sentCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("game_response", sentCheck)
                reject(`sendItem Timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("game_response", sentCheck)
        })

        this.game.socket.emit("send", { name: to, num: slot, q: quantity });
        return itemSent
    }

    public async warpToTown() {
        const currentMap = this.game.character.map
        const warpComplete = new Promise((resolve, reject) => {
            this.game.socket.once("new_map", (data: NewMapData) => {
                if (currentMap == data.map) resolve()
                else reject(`We are now in ${data.map}, but we should be in ${currentMap}`)
            })

            setTimeout(() => {
                reject(`warpToTown Timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
        })

        this.game.socket.emit("town")
        return warpComplete
    }

    public getCooldown(skill: SkillName): number {
        let nextSkill = this.game.nextSkill.get(skill)
        if (!nextSkill) return 0

        let cooldown = nextSkill.getTime() - Date.now()
        if (cooldown < 0) return 0
        return cooldown
    }

    public getNearestMonster(mtype: MonsterName): EntityData {
        let closest: EntityData;
        let closestD = Number.MAX_VALUE
        this.game.entities.forEach((entity) => {
            if (mtype && entity.type != mtype) return
            if (!closest) {
                closest = entity
            } else {
                let d = Math.sqrt((this.game.character.x - entity.x) ** 2 + (this.game.character.y - entity.y) ** 2)
                if (d < closestD) {
                    closest = entity
                    closestD = d
                }
            }
        })
        return closest
    }
}