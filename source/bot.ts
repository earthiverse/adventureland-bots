import { Game } from "./game.js";
import { CharacterData, ActionData, NewMapData, EvalData, EntityData, GameResponseData, GameResponseBuySuccess, GameResponseDataObject, DeathData, GameResponseAttackFailed, GameResponseItemSent, PlayerData, GameResponseBankRestrictions, DisappearingTextData, UpgradeData } from "./definitions/adventureland-server"
import { SkillName, MonsterName, ItemName, SlotType } from "./definitions/adventureland"

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
                reject(`attack timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("action", attackCheck)
            this.game.socket.on("game_response", failCheck)
            this.game.socket.on("death", deathCheck)
        })

        this.game.socket.emit("attack", { id: id })
        return attackStarted
    }

    public async buy(itemName: ItemName, quantity: number = 1) {
        if (this.game.character.gold < G.items[itemName].gold) return Promise.reject(`Insufficient gold. We have ${this.game.character.gold}, but the item costs ${G.items[itemName].gold}`)

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
                reject(`buy timeout (${TIMEOUT}ms)`)
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

    public async compound(item1Pos: number, item2Pos: number, item3Pos: number, cscrollPos: number, offeringPos?: number): Promise<boolean> {
        const item1Info = parent.character.items[item1Pos]
        const item2Info = parent.character.items[item2Pos]
        const item3Info = parent.character.items[item3Pos]
        if (!item1Info) return Promise.reject(`There is no item in inventory slot ${item1Pos}.`)
        if (!item2Info) return Promise.reject(`There is no item in inventory slot ${item2Pos}.`)
        if (!item3Info) return Promise.reject(`There is no item in inventory slot ${item3Pos}.`)
        if (item1Info.name != item2Info.name || item1Info.name != item3Info.name) return Promise.reject("You can only combine 3 of the same items.")
        if (item1Info.level != item2Info.level || item1Info.level != item3Info.level) return Promise.reject("You can only combine 3 items of the same level.")

        const compoundComplete = new Promise<boolean>((resolve, reject) => {
            const completeCheck = (data: UpgradeData) => {
                if (data.type == "compound") {
                    this.game.socket.removeListener("upgrade", completeCheck)
                    this.game.socket.removeListener("game_response", bankCheck)
                    resolve(data.success == 1)
                }
            }
            const bankCheck = (data: GameResponseData) => {
                if ((data as GameResponseBankRestrictions).response == "bank_restrictions"
                    && (data as GameResponseBankRestrictions).place == "compound") {
                    this.game.socket.removeListener("upgrade", completeCheck)
                    this.game.socket.removeListener("game_response", bankCheck)
                    reject("You can't compound items in the bank.")
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("upgrade", completeCheck)
                this.game.socket.removeListener("game_response", bankCheck)
                reject(`compound timeout (60000ms)`)
            }, 60000)
            this.game.socket.on("upgrade", completeCheck)
            this.game.socket.on("game_response", bankCheck)
        })

        this.game.socket.emit("compound", {
            "items": [item1Pos, item2Pos, item3Pos],
            "scroll_num": cscrollPos,
            "clevel": 0
        })
        return compoundComplete
    }

    public async equip(inventoryPos: number, equipSlot?: SlotType) {
        if (!this.game.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)

        const iInfo = this.game.character.items[inventoryPos]
        // const gInfo = Game.G.items[iInfo.name]
        // const beforeSlots = this.game.character.slots

        const equipFinished = new Promise((resolve, reject) => {
            const equipCheck = (data: CharacterData) => {
                if (equipSlot) {
                    // Check the slot we equipped it to
                    const item = data.slots[equipSlot]
                    if (item.name == iInfo.name
                        && item.level == iInfo.level
                        && item.p == iInfo.p) {
                        this.game.socket.removeListener("player", equipCheck)
                        this.game.socket.removeListener("disappearing_text", cantEquipCheck)
                        resolve()
                    }
                } else {
                    // Look for the item in all of the slots
                    for (let slot in data.slots) {
                        const item = data.slots[slot as SlotType]
                        if (item.name == iInfo.name) {
                            this.game.socket.removeListener("player", equipCheck)
                            this.game.socket.removeListener("disappearing_text", cantEquipCheck)
                            resolve()
                        }
                    }
                }
            }
            const cantEquipCheck = (data: DisappearingTextData) => {
                if (data.id == this.game.character.id && data.message == "CAN'T EQUIP") {
                    this.game.socket.removeListener("player", equipCheck)
                    this.game.socket.removeListener("disappearing_text", cantEquipCheck)
                    reject(`Can't equip '${inventoryPos}' (${iInfo.name})`)
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("player", equipCheck)
                this.game.socket.removeListener("disappearing_text", cantEquipCheck)
                reject(`equip timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("player", equipCheck)
            this.game.socket.on("disappearing_text", cantEquipCheck)
        })

        this.game.socket.emit("equip", { num: inventoryPos, slot: equipSlot })
        return equipFinished
    }

    public async exchange(inventoryPos: number) {
        if (!this.game.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)

        const exchangeFinished = new Promise((resolve, reject) => {
            const completeCheck = (data: UpgradeData) => {
                if (data.type == "exchange") {
                    this.game.socket.removeListener("upgrade", completeCheck)
                    this.game.socket.removeListener("game_response", bankCheck)
                    resolve(data.success == 1)
                }
            }
            const bankCheck = (data: GameResponseData) => {
                if ((data as GameResponseBankRestrictions).response == "bank_restrictions"
                    && (data as GameResponseBankRestrictions).place == "upgrade") {
                    this.game.socket.removeListener("upgrade", completeCheck)
                    this.game.socket.removeListener("game_response", bankCheck)
                    reject("You can't exchange items in the bank.")
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("upgrade", completeCheck)
                this.game.socket.removeListener("game_response", bankCheck)
                reject(`exchange timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("game_response", bankCheck)
            this.game.socket.on("upgrade", completeCheck)
        })

        this.game.socket.emit("exchange", { item_num: inventoryPos, q: parent.character.items[inventoryPos]?.q })
        return exchangeFinished
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
                reject(`move timeout (${TIMEOUT + distance * 1000 / this.game.character.speed}ms)`)
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
                reject(`regenHP timeout (${TIMEOUT}ms)`)
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
                reject(`regenMP timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("eval", regenCheck)
        })

        this.game.socket.emit("use", { item: "mp" })
        return regenReceived
    }

    public async sendItem(to: string, inventoryPos: number, quantity: number = 1) {
        if (!this.game.players.has(to)) return Promise.reject(`"${to}" is not nearby.`)
        if (!this.game.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)
        if (this.game.character.items[inventoryPos]?.q < quantity) return Promise.reject(`We only have a quantity of ${this.game.character.items[inventoryPos].q}, not ${quantity}.`)

        const item = this.game.character.items[inventoryPos]

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
                reject(`sendItem timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("game_response", sentCheck)
        })

        this.game.socket.emit("send", { name: to, num: inventoryPos, q: quantity });
        return itemSent
    }

    public async unequip(slot: SlotType) {
        if (this.game.character.slots[slot] === null) return Promise.reject(`Slot ${slot} is empty; nothing to unequip.`)
        if (this.game.character.slots[slot] === undefined) return Promise.reject(`Slot ${slot} does not exist.`)

        const unequipped = new Promise((resolve, reject) => {
            const unequipCheck = (data: CharacterData) => {
                if (this.game.character.slots[slot] === null) {
                    this.game.socket.removeListener("player", unequipCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("player", unequipCheck)
                reject(`unequip timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
        })

        this.game.socket.emit("unequip", { slot: slot })
        return unequipped
    }

    public async upgrade(itemPos: number, scrollPos: number): Promise<boolean> {
        if (!this.game.character.items[itemPos]) return Promise.reject(`There is no item in inventory slot ${itemPos}.`)
        if (!this.game.character.items[scrollPos]) return Promise.reject(`There is no scroll in inventory slot ${scrollPos}.`)

        const upgradeComplete = new Promise<boolean>((resolve, reject) => {
            const completeCheck = (data: UpgradeData) => {
                if (data.type == "upgrade") {
                    this.game.socket.removeListener("upgrade", completeCheck)
                    this.game.socket.removeListener("game_response", bankCheck)
                    resolve(data.success == 1)
                }
            }
            const bankCheck = (data: GameResponseData) => {
                if ((data as GameResponseBankRestrictions).response == "bank_restrictions"
                    && (data as GameResponseBankRestrictions).place == "upgrade") {
                    this.game.socket.removeListener("upgrade", completeCheck)
                    this.game.socket.removeListener("game_response", bankCheck)
                    reject("You can't upgrade items in the bank.")
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("upgrade", completeCheck)
                this.game.socket.removeListener("game_response", bankCheck)
                reject(`upgrade timeout (60000ms)`)
            }, 60000)
            this.game.socket.on("upgrade", completeCheck)
            this.game.socket.on("game_response", bankCheck)
        })

        this.game.socket.emit("upgrade", { item_num: itemPos, scroll_num: scrollPos, clevel: this.game.character.items[itemPos].level })
        return upgradeComplete
    }

    public async warpToTown() {
        const currentMap = this.game.character.map
        const warpComplete = new Promise((resolve, reject) => {
            this.game.socket.once("new_map", (data: NewMapData) => {
                if (currentMap == data.map) resolve()
                else reject(`We are now in ${data.map}, but we should be in ${currentMap}`)
            })

            setTimeout(() => {
                reject(`warpToTown timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
        })

        this.game.socket.emit("town")
        return warpComplete
    }

    public findItem(itemName: ItemName): number {
        for (let i = 0; i < this.game.character.items.length; i++) {
            let item = this.game.character.items[i]
            if (!item) continue

            if (item.name == itemName) return i
        }
    }

    public getCooldown(skill: SkillName): number {
        let nextSkill = this.game.nextSkill.get(skill)
        if (!nextSkill) return 0

        let cooldown = nextSkill.getTime() - Date.now()
        if (cooldown < 0) return 0
        return cooldown
    }

    public getNearestMonster(mtype?: MonsterName): { monster: EntityData, distance: number } {
        let closest: EntityData;
        let closestD = Number.MAX_VALUE
        this.game.entities.forEach((entity) => {
            if (mtype && entity.type != mtype) return
            let d = Math.sqrt((this.game.character.x - entity.x) ** 2 + (this.game.character.y - entity.y) ** 2)
            if (d < closestD) {
                closest = entity
                closestD = d
            }
        })
        return { monster: closest, distance: closestD }
    }

    public getNearestPlayer(): { player: PlayerData, distance: number } {
        let closest: PlayerData;
        let closestD = Number.MAX_VALUE
        this.game.players.forEach((player) => {
            if (player.s?.invincible) return
            let d = Math.sqrt((this.game.character.x - player.x) ** 2 + (this.game.character.y - player.y) ** 2)
            if (d < closestD) {
                closest = player
                closestD = d
            }
        })
        return { player: closest, distance: closestD }
    }
}