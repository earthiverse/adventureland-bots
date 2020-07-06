import { Game } from "./game";
import { CharacterData, ActionData, NewMapData, EvalData, EntityData } from "./definitions/adventureland-server";
import { SkillName, MonsterName } from "./definitions/adventureland";

const TIMEOUT = 5000

export class Bot {
    private game: Game

    constructor(game: Game) {
        this.game = game
    }

    public async move(x: number, y: number) {
        const moveStarted = new Promise((resolve) => {
            const moveCheck = (data: CharacterData) => {
                if (data.going_x == x && data.going_y == y) {
                    this.game.socket.removeListener("player", moveCheck)
                    resolve()
                }
            }
            this.game.socket.on("player", moveCheck)
        })
        const moveTimeout = new Promise((_resolve, reject) => setTimeout(reject, TIMEOUT))
        this.game.socket.emit("move", {
            x: this.game.character.x,
            y: this.game.character.y,
            going_x: x,
            going_y: y,
            m: this.game.character.m
        })
        return Promise.race([moveStarted, moveTimeout])
    }

    public async attack(id: string) {
        if (!this.game.entities.has(id)) return Promise.reject(`No Entity with ID '${id}'`)

        const attackStarted = new Promise((resolve, reject) => {
            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.game.character.id) {
                    this.game.socket.removeListener("action", attackCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("action", attackCheck)
                reject(`Attack Timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("action", attackCheck)
        })
        this.game.socket.emit("attack", { id: id })
        return attackStarted
    }

    public async regenHP() {
        if (this.game.nextSkill.get("use_hp")?.getTime() < Date.now()) return Promise.reject("use_hp is on cooldown")

        const regenReceived = new Promise((resolve) => {
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.game.socket.removeListener("eval", regenCheck)
                    resolve()
                }
            }
            this.game.socket.on("eval", regenCheck)
        })
        const regenTimeout = new Promise((_resolve, reject) => setTimeout(reject, TIMEOUT))
        this.game.socket.emit("use", { item: "hp" })
        return Promise.race([regenReceived, regenTimeout])
    }

    public async regenMP() {
        if (this.game.nextSkill.get("use_mp")?.getTime() < Date.now()) return Promise.reject("use_mp is on cooldown")

        const regenReceived = new Promise((resolve) => {
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.game.socket.removeListener("eval", regenCheck)
                    resolve()
                }
            }
            this.game.socket.on("eval", regenCheck)
        })
        const regenTimeout = new Promise((_resolve, reject) => setTimeout(reject, TIMEOUT))
        this.game.socket.emit("use", { item: "mp" })
        return Promise.race([regenReceived, regenTimeout])
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
        const warpTimeout = new Promise((_resolve, reject) => setTimeout(reject, TIMEOUT))
        return Promise.race([warpComplete, warpTimeout])
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