import { Game } from "./game.js"
import { CharacterData, ActionData, NewMapData, EvalData, EntityData, GameResponseData, GameResponseBuySuccess, GameResponseDataObject, DeathData, GameResponseAttackFailed, GameResponseItemSent, PlayerData, GameResponseBankRestrictions, DisappearingTextData, UpgradeData, PartyData, GameLogData, GameResponseAttackTooFar, GameResponseCooldown, UIData } from "./definitions/adventureland-server"
import { SkillName, MonsterName, ItemName, SlotType, ItemInfo } from "./definitions/adventureland"
import { Tools } from "./tools.js"
import { Pathfinder } from "./pathfinder.js"

const TIMEOUT = 1000

/**
 * Implement functions that depend on server events here
 */
class BotBase {
    public game: Game

    constructor(game: Game) {
        this.game = game
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
                if (data.list.includes(this.game.character.id)
                    && data.list.includes(id)) {
                    this.game.socket.removeListener("party_update", partyCheck)
                    this.game.socket.removeListener("game_log", unableCheck)
                    resolve(data)
                }
            }

            const unableCheck = (data: GameLogData) => {
                const notFound = RegExp("^.+? is not found$")
                if (data == "Invitation expired") {
                    this.game.socket.removeListener("party_update", partyCheck)
                    this.game.socket.removeListener("game_log", unableCheck)
                    reject(data)
                } else if (notFound.test(data)) {
                    this.game.socket.removeListener("party_update", partyCheck)
                    this.game.socket.removeListener("game_log", unableCheck)
                    reject(data)
                } else if (data == "Already partying") {
                    if (this.game.party.list.includes(this.game.character.id)
                        && this.game.party.list.includes(id)) {
                        // NOTE: We resolve the promise even if we have already accepted it if we're in the correct party.
                        this.game.socket.removeListener("party_update", partyCheck)
                        this.game.socket.removeListener("game_log", unableCheck)
                        resolve(this.game.party)
                    } else {
                        this.game.socket.removeListener("party_update", partyCheck)
                        this.game.socket.removeListener("game_log", unableCheck)
                        reject(data)
                    }
                }
            }

            setTimeout(() => {
                this.game.socket.removeListener("party_update", partyCheck)
                this.game.socket.removeListener("game_log", unableCheck)
                reject(`acceptPartyInvite timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("party_update", partyCheck)
            this.game.socket.on("game_log", unableCheck)
        })

        return acceptedInvite
    }

    // TODO: Return attack info
    // TODO: Add 'notthere' (e.g. calling attack("12345") returns ["notthere", {place: "attack"}])
    // TODO: Check if cooldown is sent after attack
    public attack(id: string): Promise<string> {
        if (!this.game.entities.has(id) && !this.game.players.has(id)) return Promise.reject(`No Entity with ID '${id}'`)

        const attackStarted = new Promise<string>((resolve, reject) => {
            const deathCheck = (data: DeathData) => {
                if (data.id == id) {
                    this.game.socket.removeListener("action", attackCheck)
                    this.game.socket.removeListener("game_response", failCheck)
                    this.game.socket.removeListener("death", deathCheck)
                    reject(`Entity ${id} not found`)
                }
            }
            const failCheck = (data: GameResponseData) => {
                if ((data as GameResponseDataObject).response == "disabled") {
                    this.game.socket.removeListener("action", attackCheck)
                    this.game.socket.removeListener("game_response", failCheck)
                    this.game.socket.removeListener("death", deathCheck)
                    reject(`Attack on ${id} failed (disabled).`)
                } else if ((data as GameResponseDataObject).response == "attack_failed") {
                    if ((data as GameResponseAttackFailed).id == id) {
                        this.game.socket.removeListener("action", attackCheck)
                        this.game.socket.removeListener("game_response", failCheck)
                        this.game.socket.removeListener("death", deathCheck)
                        reject(`Attack on ${id} failed.`)
                    }
                } else if ((data as GameResponseDataObject).response == "too_far") {
                    if ((data as GameResponseAttackTooFar).id == id) {
                        this.game.socket.removeListener("action", attackCheck)
                        this.game.socket.removeListener("game_response", failCheck)
                        this.game.socket.removeListener("death", deathCheck)
                        reject(`${id} is too far away to attack (dist: ${((data as GameResponseAttackTooFar).dist)}).`)
                    }
                } else if ((data as GameResponseDataObject).response == "cooldown") {
                    if ((data as GameResponseCooldown).id == id) {
                        this.game.socket.removeListener("action", attackCheck)
                        this.game.socket.removeListener("game_response", failCheck)
                        this.game.socket.removeListener("death", deathCheck)
                        reject(`Attack on ${id} failed due to cooldown (ms: ${((data as GameResponseCooldown).ms)}).`)
                    }
                }
            }
            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.game.character.id && data.target == id && data.type == "attack") {
                    this.game.socket.removeListener("action", attackCheck)
                    this.game.socket.removeListener("game_response", failCheck)
                    this.game.socket.removeListener("death", deathCheck)
                    resolve(data.pid)
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

    // TODO: Return buy info
    public buy(itemName: ItemName, quantity = 1): Promise<unknown> {
        if (this.game.character.gold < this.game.G.items[itemName].gold) return Promise.reject(`Insufficient gold. We have ${this.game.character.gold}, but the item costs ${this.game.G.items[itemName].gold}`)

        const itemReceived = new Promise((resolve, reject) => {
            const buyCheck1 = (data: CharacterData) => {
                if (!data.hitchhikers) return
                for (const hitchhiker of data.hitchhikers) {
                    if (hitchhiker[0] == "game_response") {
                        const data: GameResponseData = hitchhiker[1]
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
                if (data == "buy_cant_npc") {
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

        if (this.game.G.items[itemName].s) {
            // Item is stackable
            this.game.socket.emit("buy", { name: itemName, quantity: quantity })
        } else {
            // Item is not stackable.
            this.game.socket.emit("buy", { name: itemName })
        }
        return itemReceived
    }

    // TODO: Return better compound info
    public compound(item1Pos: number, item2Pos: number, item3Pos: number, cscrollPos: number, offeringPos?: number): Promise<boolean> {
        const item1Info = this.game.character.items[item1Pos]
        const item2Info = this.game.character.items[item2Pos]
        const item3Info = this.game.character.items[item3Pos]
        const cscrollInfo = this.game.character.items[cscrollPos]
        if (!item1Info) return Promise.reject(`There is no item in inventory slot ${item1Pos} (item1).`)
        if (!item2Info) return Promise.reject(`There is no item in inventory slot ${item2Pos} (item2).`)
        if (!item3Info) return Promise.reject(`There is no item in inventory slot ${item3Pos} (item3).`)
        if (!cscrollInfo) return Promise.reject(`There is no item in inventory slot ${cscrollPos} (cscroll).`)
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
                reject("compound timeout (60000ms)")
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

    public equip(inventoryPos: number, equipSlot?: SlotType): Promise<unknown> {
        if (!this.game.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)

        const iInfo = this.game.character.items[inventoryPos]
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
                        this.game.socket.removeListener("player", equipCheck)
                        this.game.socket.removeListener("disappearing_text", cantEquipCheck)
                        resolve()
                    }
                } else {
                    // Look for the item in all of the slots
                    for (const slot in data.slots) {
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

    public exchange(inventoryPos: number): Promise<unknown> {
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

        this.game.socket.emit("exchange", { item_num: inventoryPos, q: this.game.character.items[inventoryPos]?.q })
        return exchangeFinished
    }

    public getMonsterHuntQuest(): Promise<unknown> {
        const questGot = new Promise((resolve, reject) => {
            const questGotCheck = (data: GameResponseData) => {
                if (data == "ecu_get_closer") {
                    this.game.socket.removeListener("game_response", questGotCheck)
                    this.game.socket.removeListener("player", questGotCheck2)
                    reject("Too far away from Monster Hunt NPC.")
                } else if (data == "monsterhunt_merchant") {
                    this.game.socket.removeListener("game_response", questGotCheck)
                    this.game.socket.removeListener("player", questGotCheck2)
                    reject("Merchants can't do Monster Hunts.")
                }
            }
            const questGotCheck2 = (data: CharacterData) => {
                if (!data.hitchhikers) return
                for (const hitchhiker of data.hitchhikers) {
                    if (hitchhiker[0] == "game_response" && hitchhiker[1] == "monsterhunt_started") {
                        this.game.socket.removeListener("game_response", questGotCheck)
                        this.game.socket.removeListener("player", questGotCheck2)
                        resolve()
                        return
                    }
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("game_response", questGotCheck)
                this.game.socket.removeListener("player", questGotCheck2)
                reject(`getMonsterHuntQuest timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("game_response", questGotCheck)
            this.game.socket.on("player", questGotCheck2)
        })

        this.game.socket.emit("monsterhunt")
        return questGot
    }

    public getPontyItems(): Promise<ItemInfo[]> {
        const pontyItems = new Promise<ItemInfo[]>((resolve, reject) => {
            const distanceCheck = (data: GameResponseData) => {
                if (data == "buy_get_closer") {
                    this.game.socket.removeListener("game_response", distanceCheck)
                    this.game.socket.removeListener("secondhands", secondhandsItems)
                    reject("Too far away from secondhands NPC.")
                }
            }

            const secondhandsItems = (data: ItemInfo[]) => {
                this.game.socket.removeListener("game_response", distanceCheck)
                this.game.socket.removeListener("secondhands", secondhandsItems)
                resolve(data)
            }

            setTimeout(() => {
                this.game.socket.removeListener("game_response", distanceCheck)
                this.game.socket.removeListener("secondhands", secondhandsItems)
                reject(`getPontyItems timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("secondhands", secondhandsItems)
            this.game.socket.on("game_response", distanceCheck)
        })

        this.game.socket.emit("secondhands")
        return pontyItems
    }

    public move(x: number, y: number): Promise<unknown> {
        const pathfinder = Pathfinder.getInstance(this.game.G)
        const safeTo = pathfinder.getSafeWalkTo(
            { map: this.game.character.map, x: this.game.character.x, y: this.game.character.y },
            { map: this.game.character.map, x, y })
        if (safeTo.x !== x || safeTo.y !== y) {
            console.warn(`move: We can't move to {x: ${x}, y: ${y}} safely. We will move to {x: ${safeTo.x}, y: ${safeTo.y}.}`)
        }

        const moveFinished = new Promise((resolve, reject) => {
            let dealtWith = false
            const distance = Tools.distance(this.game.character, { x: safeTo.x, y: safeTo.y })
            const moveFinishedCheck = (data: CharacterData) => {
                // TODO: Improve this to check if we moved again, and if we did, reject()
                if (data.moving) return
                if (data.x == safeTo.x && data.y == safeTo.y) {
                    if (!dealtWith) {
                        this.game.socket.removeListener("player", moveFinishedCheck)
                        resolve()
                        dealtWith = true
                    }
                }
            }
            setTimeout(() => {
                if (!dealtWith) {
                    this.game.socket.removeListener("player", moveFinishedCheck)
                    reject(`move timeout (${TIMEOUT + distance * 1000 / this.game.character.speed}ms)`)
                    dealtWith = true
                }
            }, (TIMEOUT + distance * 1000 / this.game.character.speed))
            this.game.socket.on("player", moveFinishedCheck)
        })

        this.game.socket.emit("move", {
            x: this.game.character.x,
            y: this.game.character.y,
            going_x: safeTo.x,
            going_y: safeTo.y,
            m: this.game.character.m
        })
        return moveFinished
    }

    public regenHP(): Promise<unknown> {
        // if (this.game.nextSkill.get("use_hp")?.getTime() > Date.now()) return Promise.reject("use_hp is on cooldown")

        const regenReceived = new Promise((resolve, reject) => {
            let dealtWith = false
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    if (!dealtWith) {
                        this.game.socket.removeListener("eval", regenCheck)
                        resolve()
                        dealtWith = true
                    }
                }
            }
            setTimeout(() => {
                if (!dealtWith) {
                    this.game.socket.removeListener("eval", regenCheck)
                    reject(`regenHP timeout (${TIMEOUT}ms)`)
                    dealtWith = true
                }
            }, TIMEOUT)
            this.game.socket.on("eval", regenCheck)
        })

        this.game.socket.emit("use", { item: "hp" })
        return regenReceived
    }

    public regenMP(): Promise<unknown> {
        // if (this.game.nextSkill.get("use_mp")?.getTime() > Date.now()) return Promise.reject("use_mp is on cooldown")

        const regenReceived = new Promise((resolve, reject) => {
            let dealtWith = false
            const regenCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    if (!dealtWith) {
                        this.game.socket.removeListener("eval", regenCheck)
                        resolve()
                        dealtWith = true
                    }
                }
            }
            setTimeout(() => {
                if (!dealtWith) {
                    this.game.socket.removeListener("eval", regenCheck)
                    reject(`regenMP timeout (${TIMEOUT}ms)`)
                    dealtWith = true
                }
            }, TIMEOUT)
            this.game.socket.on("eval", regenCheck)
        })

        this.game.socket.emit("use", { item: "mp" })
        return regenReceived
    }

    public scare(): Promise<string[]> {
        const scared = new Promise<string[]>((resolve, reject) => {
            // TODO: Move this typescript to a definition
            let ids: string[]
            const idsCheck = (data: UIData) => {
                if (data.type == "scare") {
                    ids = data.ids
                    this.game.socket.removeListener("ui", idsCheck)
                }
            }

            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]scare['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.game.socket.removeListener("ui", idsCheck)
                    this.game.socket.removeListener("eval", cooldownCheck)
                    resolve(ids)
                }
            }

            setTimeout(() => {
                this.game.socket.removeListener("ui", idsCheck)
                this.game.socket.removeListener("eval", cooldownCheck)
                reject(`sendItem timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("ui", idsCheck)
            this.game.socket.on("eval", cooldownCheck)
        })

        this.game.socket.emit("skill", { name: "scare" })
        return scared
    }

    public sendItem(to: string, inventoryPos: number, quantity = 1): Promise<unknown> {
        if (!this.game.players.has(to)) return Promise.reject(`"${to}" is not nearby.`)
        if (!this.game.character.items[inventoryPos]) return Promise.reject(`No item in inventory slot ${inventoryPos}.`)
        if (this.game.character.items[inventoryPos]?.q < quantity) return Promise.reject(`We only have a quantity of ${this.game.character.items[inventoryPos].q}, not ${quantity}.`)

        const item = this.game.character.items[inventoryPos]

        const itemSent = new Promise((resolve, reject) => {
            const sentCheck = (data: GameResponseData) => {
                if (data == "trade_get_closer") {
                    this.game.socket.removeListener("game_response", sentCheck)
                    reject(`sendItem failed, ${to} is too far away`)
                } else if (data == "send_no_space") {
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

        this.game.socket.emit("send", { name: to, num: inventoryPos, q: quantity })
        return itemSent
    }

    /**
     * 
     * @param id The character ID to invite to our party.
     */
    // TODO: See what socket events happen, and see if we can see if the server picked up our request
    public sendPartyInvite(id: string) {
        this.game.socket.emit("party", { event: "request", name: id })
    }

    public unequip(slot: SlotType): Promise<unknown> {
        if (this.game.character.slots[slot] === null) return Promise.reject(`Slot ${slot} is empty; nothing to unequip.`)
        if (this.game.character.slots[slot] === undefined) return Promise.reject(`Slot ${slot} does not exist.`)

        const unequipped = new Promise((resolve, reject) => {
            const unequipCheck = (data: CharacterData) => {
                if (data.slots[slot] === null) {
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

    public upgrade(itemPos: number, scrollPos: number): Promise<boolean> {
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
                reject("upgrade timeout (60000ms)")
            }, 60000)
            this.game.socket.on("upgrade", completeCheck)
            this.game.socket.on("game_response", bankCheck)
        })

        this.game.socket.emit("upgrade", { item_num: itemPos, scroll_num: scrollPos, clevel: this.game.character.items[itemPos].level })
        return upgradeComplete
    }

    // TODO: Check if it's an HP Pot
    public useHPPot(itemPos: number): Promise<unknown> {
        if (!this.game.character.items[itemPos]) return Promise.reject(`There is no item in inventory slot ${itemPos}.`)

        const healReceived = new Promise((resolve, reject) => {
            const healCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.game.socket.removeListener("eval", healCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("eval", healCheck)
                reject(`useHPPot timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("eval", healCheck)
        })

        this.game.socket.emit("equip", { num: itemPos })
        return healReceived
    }

    // TODO: Check if it's an MP Pot
    public useMPPot(itemPos: number): Promise<unknown> {
        if (!this.game.character.items[itemPos]) return Promise.reject(`There is no item in inventory slot ${itemPos}.`)

        const healReceived = new Promise((resolve, reject) => {
            const healCheck = (data: EvalData) => {
                if (data.code.includes("pot_timeout")) {
                    this.game.socket.removeListener("eval", healCheck)
                    resolve()
                }
            }
            setTimeout(() => {
                this.game.socket.removeListener("eval", healCheck)
                reject(`useMPPot timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("eval", healCheck)
        })

        this.game.socket.emit("equip", { num: itemPos })
        return healReceived
    }

    public warpToTown(): Promise<unknown> {
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
}

/**
 * Implement functions that don't depend on server events here
 */
export class Bot extends BotBase {
    public getCooldown(skill: SkillName): number {
        const nextSkill = this.game.nextSkill.get(skill)
        if (!nextSkill) return 0

        const cooldown = nextSkill.getTime() - Date.now()
        if (cooldown < 0) return 0
        return cooldown
    }

    public getNearestMonster(mtype?: MonsterName): { monster: EntityData, distance: number } {
        let closest: EntityData
        let closestD = Number.MAX_VALUE
        this.game.entities.forEach((entity) => {
            if (mtype && entity.type != mtype) return
            const d = Tools.distance(this.game.character, entity)
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
        this.game.players.forEach((player) => {
            if (player.s?.invincible) return
            if (player.npc) return
            const d = Tools.distance(this.game.character, player)
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
    public hasItem(itemName: ItemName, inventory = this.game.character.items): boolean {
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
        for (const slot in this.game.character.slots) {
            if (!this.game.character.slots[slot as SlotType]) continue // Nothing equipped in this slot
            if (this.game.character.slots[slot as SlotType].name == itemName) return true
        }
        return false
    }

    /**
     * Returns a boolean corresponding to whether or not we can attack other players
     */
    public isPVP(): boolean {
        if (this.game.G[this.game.character.map].pvp) return true
        return this.game.server.pvp
    }

    /**
     * Returns the index of the item in the given inventory
     * @param itemName The item to look for
     * @param inventory Where to look for the item
     */
    public locateItem(itemName: ItemName, inventory = this.game.character.items): Promise<number> {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < inventory.length; i++) {
                const item = inventory[i]
                if (!item) continue

                if (item.name == itemName) {
                    resolve(i)
                    return
                }
            }
            reject(`Could not locate ${itemName}.`)
        })
    }
}

/** Implement functions that only apply to rangers */
export class RangerBot extends Bot {
    public fiveShot(target1: string, target2: string, target3: string, target4: string, target5: string): Promise<string[]> {
        const attackStarted = new Promise<string[]>((resolve, reject) => {
            const projectiles: string[] = []

            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.game.character.id
                    && data.type == "5shot"
                    && (data.target == target1 || data.target == target2 || data.target == target3 || data.target == target4 || data.target == target5)) {
                    projectiles.push(data.pid)
                }
            }

            // TODO: Confirm that the cooldown is always sent after the projectiles
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]5shot['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.game.socket.removeListener("action", attackCheck)
                    this.game.socket.removeListener("eval", cooldownCheck)
                    resolve(projectiles)
                }
            }

            setTimeout(() => {
                this.game.socket.removeListener("action", attackCheck)
                this.game.socket.removeListener("eval", cooldownCheck)
                reject(`attack timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("action", attackCheck)
            this.game.socket.on("eval", cooldownCheck)
        })

        this.game.socket.emit("skill", {
            name: "5shot",
            ids: [target1, target2, target3, target4, target5]
        })
        return attackStarted
    }

    public threeShot(target1: string, target2: string, target3: string): Promise<string[]> {
        const attackStarted = new Promise<string[]>((resolve, reject) => {
            const projectiles: string[] = []

            const attackCheck = (data: ActionData) => {
                if (data.attacker == this.game.character.id
                    && data.type == "3shot"
                    && (data.target == target1 || data.target == target2 || data.target == target3)) {
                    projectiles.push(data.pid)
                }
            }

            // TODO: Confirm that the cooldown is always sent after the projectiles
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]3shot['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.game.socket.removeListener("action", attackCheck)
                    this.game.socket.removeListener("eval", cooldownCheck)
                    resolve(projectiles)
                }
            }

            setTimeout(() => {
                this.game.socket.removeListener("action", attackCheck)
                this.game.socket.removeListener("eval", cooldownCheck)
                reject(`attack timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("action", attackCheck)
            this.game.socket.on("eval", cooldownCheck)
        })

        this.game.socket.emit("skill", {
            name: "3shot",
            ids: [target1, target2, target3]
        })
        return attackStarted
    }
}

/** Implement functions that only apply to warriors */
export class WarriorBot extends Bot {
    // TODO: Investigate why the cooldown check doesn't work.
    public agitate(): Promise<unknown> {
        const agitated = new Promise((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]agitate['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.game.socket.removeListener("eval", cooldownCheck)
                    this.game.socket.removeListener("game_response", failCheck)
                    resolve()
                }
            }

            const failCheck = (data: GameResponseData) => {
                if ((data as GameResponseDataObject).response == "cooldown") {
                    if ((data as GameResponseCooldown).skill == "agitate") {
                        this.game.socket.removeListener("eval", cooldownCheck)
                        this.game.socket.removeListener("game_response", failCheck)
                        reject(`Agitate failed due to cooldown (ms: ${((data as GameResponseCooldown).ms)}).`)
                    }
                }
            }

            setTimeout(() => {
                this.game.socket.removeListener("eval", cooldownCheck)
                this.game.socket.removeListener("game_response", failCheck)
                reject(`agitate timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("eval", cooldownCheck)
            this.game.socket.on("game_response", failCheck)
        })

        this.game.socket.emit("skill", {
            name: "agitate"
        })
        return agitated
    }

    // TODO: Investigate if cooldown is before or after the "action" event. We are getting lots of "failed due to cooldowns"
    public taunt(target: string): Promise<string> {
        const tauntStarted = new Promise<string>((resolve, reject) => {
            const tauntCheck = (data: ActionData) => {
                if (data.attacker == this.game.character.id
                    && data.type == "taunt"
                    && data.target == target) {
                    resolve(data.pid)
                    this.game.socket.removeListener("action", tauntCheck)
                }
            }

            const failCheck = (data: GameResponseData) => {
                if ((data as GameResponseDataObject).response == "no_target") {
                    this.game.socket.removeListener("action", tauntCheck)
                    this.game.socket.removeListener("game_response", failCheck)
                    reject(`Taunt on ${target} failed (no target).`)
                } else if ((data as GameResponseDataObject).response == "too_far") {
                    if ((data as GameResponseAttackTooFar).id == target) {
                        this.game.socket.removeListener("action", tauntCheck)
                        this.game.socket.removeListener("game_response", failCheck)
                        reject(`${target} is too far away to taunt (dist: ${((data as GameResponseAttackTooFar).dist)}).`)
                    }
                } else if ((data as GameResponseDataObject).response == "cooldown") {
                    if ((data as GameResponseCooldown).id == target) {
                        this.game.socket.removeListener("action", tauntCheck)
                        this.game.socket.removeListener("game_response", failCheck)
                        reject(`Taunt on ${target} failed due to cooldown (ms: ${((data as GameResponseCooldown).ms)}).`)
                    }
                }
            }

            setTimeout(() => {
                this.game.socket.removeListener("action", tauntCheck)
                this.game.socket.removeListener("game_response", failCheck)
                reject(`taunt timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.game.socket.on("action", tauntCheck)
            this.game.socket.on("game_response", failCheck)
        })

        this.game.socket.emit("skill", { name: "taunt", id: target })
        return tauntStarted
    }
}