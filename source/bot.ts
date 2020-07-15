import { Game } from "./game.js";
import { CharacterData, ActionData, NewMapData, EvalData, EntityData, GameResponseData, GameResponseBuySuccess, GameResponseDataObject, DeathData, GameResponseAttackFailed, GameResponseItemSent, PlayerData, GameResponseBankRestrictions, DisappearingTextData, UpgradeData } from "./definitions/adventureland-server"
import { SkillName, MonsterName, ItemName, SlotType } from "./definitions/adventureland"

const TIMEOUT = 5000

export class Bot {

    constructor() {
    }

    public async attack(id: string) {
        if (!Game.entities.has(id) && !Game.players.has(id)) return Promise.reject(`No Entity with ID '${id}'`)

        const attackStarted = new Promise((resolve, reject) => {
            const deathCheck = (data: DeathData) => {
                if (data.id == id) {
                    Game.socket.removeListener("action", attackCheck)
                    Game.socket.removeListener("game_response", failCheck)
                    Game.socket.removeListener("death", deathCheck)
                    reject(`Entity ${id} not found`)
                }
            }
            const failCheck = (data: GameResponseData) => {
                if ((data as GameResponseDataObject).response == "attack_failed") {
                    if ((data as GameResponseAttackFailed).id == id) {
                        Game.socket.removeListener("action", attackCheck)
                        Game.socket.removeListener("game_response", failCheck)
                        Game.socket.removeListener("death", deathCheck)
                        reject(`Attack on ${id} failed.`)
                    }
                }
            }
            const attackCheck = (data: ActionData) => {
                if (data.attacker == Game.character.id) {
                    Game.socket.removeListener("action", attackCheck)
                    Game.socket.removeListener("game_response", failCheck)
                    Game.socket.removeListener("death", deathCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("action", attackCheck)
                Game.socket.removeListener("game_response", failCheck)
                Game.socket.removeListener("death", deathCheck)
                reject(`attack timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            Game.socket.on("action", attackCheck)
            Game.socket.on("game_response", failCheck)
            Game.socket.on("death", deathCheck)
        })

        Game.socket.emit("attack", { id: id })
        return attackStarted
    }

    public async buy(itemName: ItemName, quantity: number = 1) {
        if (Game.character.gold < Game.G.items[itemName].gold) return Promise.reject(`Insufficient gold. We have ${Game.character.gold}, but the item costs ${Game.G.items[itemName].gold}`)

        const itemReceived = new Promise((resolve, reject) => {
            const buyCheck1 = (data: CharacterData) => {
                if (!data.hitchhikers) return
                for (let hitchhiker of data.hitchhikers) {
                    if (hitchhiker[0] == "game_response") {
                        let data: GameResponseData = hitchhiker[1]
                        if ((data as GameResponseDataObject).response == "buy_success"
                            && (data as GameResponseBuySuccess).name == itemName
                            && (data as GameResponseBuySuccess).q == quantity) {
                            Game.socket.removeListener("player", buyCheck1)
                            Game.socket.removeListener("game_response", buyCheck2)
                            resolve()
                        }
                    }
                }
            }
            const buyCheck2 = (data: GameResponseData) => {
                if (data = "buy_cant_npc") {
                    Game.socket.removeListener("player", buyCheck1)
                    Game.socket.removeListener("game_response", buyCheck2)
                    reject(`Cannot buy ${quantity} ${itemName}(s) from an NPC`)
                } else if (data == "buy_cant_space") {
                    Game.socket.removeListener("player", buyCheck1)
                    Game.socket.removeListener("game_response", buyCheck2)
                    reject(`Not enough inventory space to buy ${quantity} ${itemName}(s)`)
                } else if (data == "buy_cost") {
                    Game.socket.removeListener("player", buyCheck1)
                    Game.socket.removeListener("game_response", buyCheck2)
                    reject(`Not enough gold to buy ${quantity} ${itemName}(s)`)
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("player", buyCheck1)
                Game.socket.removeListener("game_response", buyCheck2)
                reject(`buy timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            Game.socket.on("player", buyCheck1)
            Game.socket.on("game_response", buyCheck2)
        })

        if (Game.G.items[itemName].s) {
            // Item is stackable
            Game.socket.emit("buy", { name: itemName, quantity: quantity })
        } else {
            // Item is not stackable.
            Game.socket.emit("buy", { name: itemName })
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
                    Game.socket.removeListener("upgrade", completeCheck)
                    Game.socket.removeListener("game_response", bankCheck)
                    resolve(data.success == 1)
                }
            }
            const bankCheck = (data: GameResponseData) => {
                if ((data as GameResponseBankRestrictions).response == "bank_restrictions"
                    && (data as GameResponseBankRestrictions).place == "compound") {
                    Game.socket.removeListener("upgrade", completeCheck)
                    Game.socket.removeListener("game_response", bankCheck)
                    reject("You can't compound items in the bank.")
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("upgrade", completeCheck)
                Game.socket.removeListener("game_response", bankCheck)
                reject(`compound timeout (60000ms)`)
            }, 60000)
            Game.socket.on("upgrade", completeCheck)
            Game.socket.on("game_response", bankCheck)
        })

        Game.socket.emit("compound", {
            "items": [item1Pos, item2Pos, item3Pos],
            "scroll_num": cscrollPos,
            "clevel": 0
        })
        return compoundComplete
    }

    public async equip(inventoryPos: number, equipSlot?: SlotType) {
        if (!Game.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)

        const iInfo = Game.character.items[inventoryPos]
        // const gInfo = Game.G.items[iInfo.name]
        // const beforeSlots = Game.character.slots

        const equipFinished = new Promise((resolve, reject) => {
            const equipCheck = (data: CharacterData) => {
                if (equipSlot) {
                    // Check the slot we equipped it to
                    const item = data.slots[equipSlot]
                    if (item.name == iInfo.name
                        && item.level == iInfo.level
                        && item.p == iInfo.p) {
                        Game.socket.removeListener("player", equipCheck)
                        Game.socket.removeListener("disappearing_text", cantEquipCheck)
                        resolve()
                    }
                } else {
                    // Look for the item in all of the slots
                    for (let slot in data.slots) {
                        const item = data.slots[slot as SlotType]
                        if (item.name == iInfo.name) {
                            Game.socket.removeListener("player", equipCheck)
                            Game.socket.removeListener("disappearing_text", cantEquipCheck)
                            resolve()
                        }
                    }
                }
            }
            const cantEquipCheck = (data: DisappearingTextData) => {
                if (data.id == Game.character.id && data.message == "CAN'T EQUIP") {
                    Game.socket.removeListener("player", equipCheck)
                    Game.socket.removeListener("disappearing_text", cantEquipCheck)
                    reject(`Can't equip '${inventoryPos}' (${iInfo.name})`)
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("player", equipCheck)
                Game.socket.removeListener("disappearing_text", cantEquipCheck)
                reject(`equip timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            Game.socket.on("player", equipCheck)
            Game.socket.on("disappearing_text", cantEquipCheck)
        })

        Game.socket.emit("equip", { num: inventoryPos, slot: equipSlot })
        return equipFinished
    }

    public async exchange(inventoryPos: number) {
        if (!Game.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)

        const exchangeFinished = new Promise((resolve, reject) => {
            const completeCheck = (data: UpgradeData) => {
                if (data.type == "exchange") {
                    Game.socket.removeListener("upgrade", completeCheck)
                    Game.socket.removeListener("game_response", bankCheck)
                    resolve(data.success == 1)
                }
            }
            const bankCheck = (data: GameResponseData) => {
                if ((data as GameResponseBankRestrictions).response == "bank_restrictions"
                    && (data as GameResponseBankRestrictions).place == "upgrade") {
                    Game.socket.removeListener("upgrade", completeCheck)
                    Game.socket.removeListener("game_response", bankCheck)
                    reject("You can't exchange items in the bank.")
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("upgrade", completeCheck)
                Game.socket.removeListener("game_response", bankCheck)
                reject(`exchange timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            Game.socket.on("game_response", bankCheck)
            Game.socket.on("upgrade", completeCheck)
        })

        Game.socket.emit("exchange", { item_num: inventoryPos, q: parent.character.items[inventoryPos]?.q })
        return exchangeFinished
    }

    public async move(x: number, y: number) {
        const moveFinished = new Promise((resolve, reject) => {
            const moveFinishedCheck = (data: CharacterData) => {
                // TODO: Improve this to check if we moved again, and if we did, reject()
                if (data.moving) return
                if (data.x == x && data.y == y) {
                    Game.socket.removeListener("player", moveFinishedCheck)
                    resolve()
                }
            }
            const distance = Math.sqrt((Game.character.x - x) ** 2 - (Game.character.y - y) ** 2)
            setTimeout(() => {
                Game.socket.removeListener("player", moveFinishedCheck)
                reject(`move timeout (${TIMEOUT + distance * 1000 / Game.character.speed}ms)`)
            }, (TIMEOUT + distance * 1000 / Game.character.speed))
            Game.socket.on("player", moveFinishedCheck)
        })

        Game.socket.emit("move", {
            x: Game.character.x,
            y: Game.character.y,
            going_x: x,
            going_y: y,
            m: Game.character.m
        })
        return moveFinished
    }

    public async regenHP() {
        if (Game.nextSkill.get("use_hp")?.getTime() > Date.now()) return Promise.reject("use_hp is on cooldown")

        const regenReceived = new Promise((resolve, reject) => {
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    Game.socket.removeListener("eval", regenCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("eval", regenCheck)
                reject(`regenHP timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            Game.socket.on("eval", regenCheck)
        })

        Game.socket.emit("use", { item: "hp" })
        return regenReceived
    }

    public async regenMP() {
        if (Game.nextSkill.get("use_mp")?.getTime() > Date.now()) return Promise.reject("use_mp is on cooldown")

        const regenReceived = new Promise((resolve, reject) => {
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    Game.socket.removeListener("eval", regenCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("eval", regenCheck)
                reject(`regenMP timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            Game.socket.on("eval", regenCheck)
        })

        Game.socket.emit("use", { item: "mp" })
        return regenReceived
    }

    public async sendItem(to: string, inventoryPos: number, quantity: number = 1) {
        if (!Game.players.has(to)) return Promise.reject(`"${to}" is not nearby.`)
        if (!Game.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)
        if (Game.character.items[inventoryPos]?.q < quantity) return Promise.reject(`We only have a quantity of ${Game.character.items[inventoryPos].q}, not ${quantity}.`)

        const item = Game.character.items[inventoryPos]

        const itemSent = new Promise((resolve, reject) => {
            const sentCheck = (data: GameResponseData) => {
                if (data == "trade_get_closer") {
                    Game.socket.removeListener("game_response", sentCheck)
                    reject(`sendItem failed, ${to} is too far away`)
                } else if (data == "trade_bspace") {
                    Game.socket.removeListener("game_response", sentCheck)
                    reject(`sendItem failed, ${to} has no inventory space`)
                } else if ((data as GameResponseItemSent).response == "item_sent"
                    && (data as GameResponseItemSent).name == to
                    && (data as GameResponseItemSent).item == item.name
                    && (data as GameResponseItemSent).q == quantity) {
                    Game.socket.removeListener("game_response", sentCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("game_response", sentCheck)
                reject(`sendItem timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            Game.socket.on("game_response", sentCheck)
        })

        Game.socket.emit("send", { name: to, num: inventoryPos, q: quantity });
        return itemSent
    }

    public async unequip(slot: SlotType) {
        if (Game.character.slots[slot] === null) return Promise.reject(`Slot ${slot} is empty; nothing to unequip.`)
        if (Game.character.slots[slot] === undefined) return Promise.reject(`Slot ${slot} does not exist.`)

        const unequipped = new Promise((resolve, reject) => {
            const unequipCheck = (data: CharacterData) => {
                if (Game.character.slots[slot] === null) {
                    Game.socket.removeListener("player", unequipCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("player", unequipCheck)
                reject(`unequip timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
        })

        Game.socket.emit("unequip", { slot: slot })
        return unequipped
    }

    public async upgrade(itemPos: number, scrollPos: number): Promise<boolean> {
        if (!Game.character.items[itemPos]) return Promise.reject(`There is no item in inventory slot ${itemPos}.`)
        if (!Game.character.items[scrollPos]) return Promise.reject(`There is no scroll in inventory slot ${scrollPos}.`)

        const upgradeComplete = new Promise<boolean>((resolve, reject) => {
            const completeCheck = (data: UpgradeData) => {
                if (data.type == "upgrade") {
                    Game.socket.removeListener("upgrade", completeCheck)
                    Game.socket.removeListener("game_response", bankCheck)
                    resolve(data.success == 1)
                }
            }
            const bankCheck = (data: GameResponseData) => {
                if ((data as GameResponseBankRestrictions).response == "bank_restrictions"
                    && (data as GameResponseBankRestrictions).place == "upgrade") {
                    Game.socket.removeListener("upgrade", completeCheck)
                    Game.socket.removeListener("game_response", bankCheck)
                    reject("You can't upgrade items in the bank.")
                }
            }
            setTimeout(() => {
                Game.socket.removeListener("upgrade", completeCheck)
                Game.socket.removeListener("game_response", bankCheck)
                reject(`upgrade timeout (60000ms)`)
            }, 60000)
            Game.socket.on("upgrade", completeCheck)
            Game.socket.on("game_response", bankCheck)
        })

        Game.socket.emit("upgrade", { item_num: itemPos, scroll_num: scrollPos, clevel: Game.character.items[itemPos].level })
        return upgradeComplete
    }

    public async warpToTown() {
        const currentMap = Game.character.map
        const warpComplete = new Promise((resolve, reject) => {
            Game.socket.once("new_map", (data: NewMapData) => {
                if (currentMap == data.map) resolve()
                else reject(`We are now in ${data.map}, but we should be in ${currentMap}`)
            })

            setTimeout(() => {
                reject(`warpToTown timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
        })

        Game.socket.emit("town")
        return warpComplete
    }

    public findItem(itemName: ItemName): number {
        for (let i = 0; i < Game.character.items.length; i++) {
            let item = Game.character.items[i]
            if (!item) continue

            if (item.name == itemName) return i
        }
    }

    public getCooldown(skill: SkillName): number {
        let nextSkill = Game.nextSkill.get(skill)
        if (!nextSkill) return 0

        let cooldown = nextSkill.getTime() - Date.now()
        if (cooldown < 0) return 0
        return cooldown
    }

    public getNearestMonster(mtype?: MonsterName): { monster: EntityData, distance: number } {
        let closest: EntityData;
        let closestD = Number.MAX_VALUE
        Game.entities.forEach((entity) => {
            if (mtype && entity.type != mtype) return
            let d = Math.sqrt((Game.character.x - entity.x) ** 2 + (Game.character.y - entity.y) ** 2)
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
        Game.players.forEach((player) => {
            if (player.s?.invincible) return
            if (player.npc) return
            let d = Math.sqrt((Game.character.x - player.x) ** 2 + (Game.character.y - player.y) ** 2)
            if (d < closestD) {
                closest = player
                closestD = d
            }
        })
        return { player: closest, distance: closestD }
    }
}