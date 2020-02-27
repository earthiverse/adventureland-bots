import { Character } from "./character"
import { MonsterType, ItemName, PositionReal, BankPackType } from "./definitions/adventureland"
import { upgradeIfMany, compoundIfMany } from "./upgrade"
import { sellUnwantedItems, exchangeItems, buyFromPonty, openMerchantStand, closeMerchantStand, buyScrolls } from "./trade"
import { getInventory, isPlayer, getCooldownMS, isAvailable, getEmptyBankSlots, sleep, getEmptySlots, isInventoryFull } from "./functions"
import { MovementTarget, TargetPriorityList } from "./definitions/bots"

class Merchant extends Character {
    targetPriority: TargetPriorityList = {
        "bee": {
            "priority": 1,
        },
        "crab": {
            "priority": 1,
        },
        "goo": {
            "priority": 1,
        },
        "hen": {
            "priority": 1
        },
        "rooster": {
            "priority": 1
        },
        "snowman": {
            "priority": 1
        }
    }
    mainTarget: MonsterType = null;

    constructor() {
        super()
        this.itemsToKeep.push(
            "cscroll0", "cscroll1", "cscroll2",
            "scroll0", "scroll1", "scroll2",
            "stand0",
            "dexscroll", "intscroll", "strscroll",
            "monstertoken"
        )
    }

    protected getMovementTarget(): MovementTarget {
        if (parent.character.rip) {
            set_message("RIP")
            return
        }

        const vendorPlace: PositionReal = { map: "main", "x": 60, "y": -325 }

        // Christmas Tree Bonus -- Visit the tree if it's up and we don't have it
        if (G.maps.main.ref.newyear_tree && !parent.character.s.holidayspirit) {
            set_message("Xmas Tree")
            return { target: "newyear_tree", position: G.maps.main.ref.newyear_tree, range: 300 }
        }

        // Full Inventory -- Deposit in bank
        if (isInventoryFull()) {
            set_message("Full!")
            if (parent.character.map == "bank") {
                return
            } else {
                // Move to the bank
                // TODO: Target the guy who stores our gold
                return { target: "items4", position: { "map": "bank", "x": 0, "y": -400 }, range: 10 }
            }
        }

        // Event Monsters -- Move to monster
        for (const mtype in parent.S) {
            const info = parent.S[mtype as MonsterType]
            if (!info.live) continue // Not alive
            if (info.hp > info.max_hp / 2) continue // Not low health
            set_message(mtype)
            return { target: mtype as MonsterType, position: info, range: 50 }
        }

        // If someone in our party isn't mlucked by us, go find them and mluck them.
        for (const name of parent.party_list) {
            if (name == parent.character.name) continue // Don't move to ourself

            const player = parent.entities[name] ? parent.entities[name] : this.info.party[name]
            if (player && player.s && (!player.s.mluck || player.s.mluck.f != parent.character.id)) {
                set_message(`ML ${name}`)
                return { position: player, range: G.skills.mluck.range - 20 }
            }
        }

        // If there are players who we have seen recently that haven't been mlucked, go find them and mluck them
        for (const name in this.info.players) {
            const player = parent.entities[name] ? parent.entities[name] : this.info.players[name]
            if (distance(parent.character, player) <= G.skills.mluck.range && (!player.s.mluck || Date.now() - new Date(this.info.players[name].lastSeen).getTime() > 3000000 || player.s.mluck.ms < 1800000)) {
                // This player moved.
                delete this.info.players[name]
                break
            } else if ((!player.s.mluck || Date.now() - new Date(this.info.players[name].lastSeen).getTime() > 3000000 || player.s.mluck.ms < 1800000) && !player.rip) {
                set_message(`ML ${name}`)
                return { position: player, range: G.skills.mluck.range - 20 }
            }
        }

        // If our players have lots of items, go offload
        for (const name of parent.party_list) {
            if (name == parent.character.name) continue // Skip ourself
            const player = this.info.party[name]
            if (player && player.items.length > 20) {
                set_message(`INV ${name}`)
                return { position: player, range: 240 }
            }
        }

        // If we haven't been to the bank in a while, go
        if (Date.now() - this.didBankStuff > 120000) {
            set_message("Bank")
            return { position: { "map": "bank", "x": 0, "y": -400 } }
        }

        // If Angel and Kane haven't been seen in a while, go find them to update their position
        if (this.info.npcs.Kane && Date.now() - new Date(this.info.npcs.Kane.lastSeen).getTime() > 300000) {
            set_message("Find Kane")
            return { position: this.info.npcs.Kane }
        } else if (this.info.npcs.Angel && Date.now() - new Date(this.info.npcs.Angel.lastSeen).getTime() > 300000) {
            set_message("Find Angel")
            return { position: this.info.npcs.Angel }
        }

        // NOTE: We have a computer now, we don't need to travel anymore
        // // If we have exchangable things, go exchange them
        // let items = getInventory();
        // if (items.length < 25) {
        //     for (const item of items) {
        //         if (G.items[item.name].quest && item.q >= G.items[item.name].e) {
        //             return { message: "Quest", target: G.quests[item.name] }
        //         }
        //     }
        // }

        // Default vendoring
        // if (this.info.npcs.Kane) {
        //     return { message: "Vendor", target: this.info.npcs.Kane }
        // } else if (this.info.npcs.Angel) {
        //     return { message: "Vendor", target: this.info.npcs.Angel }
        // } else {
        set_message("Vendor")
        return { position: vendorPlace }
        // }
    }

    protected async mainLoop(): Promise<void> {
        try {
            sellUnwantedItems(this.itemsToSell)

            let numItems = 0
            for (let i = 0; i < 42; i++) if (parent.character.items[i]) numItems++

            if (numItems < 25)
                exchangeItems(this.itemsToExchange)

            await this.bankStuff()

            if (!parent.character.moving) {
                openMerchantStand()
            } else {
                closeMerchantStand()
            }

            upgradeIfMany(8)
            compoundIfMany(4)

            // buyIfNone("blade", 9, 2)
            // upgradeItem("blade", 9)

            await buyScrolls()

            super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop() }, 1000)
        }
    }

    public run(): void {
        this.attackLoop()
        this.healLoop()
        this.scareLoop()
        this.moveLoop2()
        this.sendInfoLoop()
        this.mainLoop()
        this.luckLoop()
        this.pontyLoop()
    }

    private pontyLoop(): void {
        let foundPonty = false
        for (const npc of parent.npcs) {
            if (npc.id == "secondhands" && distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundPonty = true
                break
            }
        }
        if (!foundPonty) {
            // We're not near Ponty, so don't buy from him.
            setTimeout(() => { this.pontyLoop() }, 250)
            return
        }

        buyFromPonty(this.itemsToBuy) // Other things

        // We bought things from Ponty, wait a long time before trying to buy again.
        setTimeout(() => { this.pontyLoop() }, 15000)
    }

    private didBankStuff = 0;
    private async bankStuff(): Promise<void> {
        if (parent.character.map != "bank") {
            return
        } else if (Date.now() - this.didBankStuff < 30000) {
            return
        }

        // Store extra gold
        if (parent.character.gold > 100000000) {
            bank_deposit(parent.character.gold - 100000000)
        } else if (parent.character.gold < 100000000) {
            bank_withdraw(100000000 - parent.character.gold)
        }

        // name, level, inventory, slot #
        const items: [ItemName, number, string, number][] = []

        // Add items from inventory
        for (const item of getInventory()) {
            if (this.itemsToKeep.includes(item.name)) continue // Don't add items we want to keep


            if (G.items[item.name].s) {
                // If the item is stackable, deposit it.
                await sleep(parent.character.ping)
                bank_store(item.index)
                continue
            }

            // Add it to our list of items
            // items.push([item.name, item.level, "items", item.index])

            // Store all items for now
            let i = 0
            const emptySlots = getEmptyBankSlots() || []
            if (i < emptySlots.length) {
                await sleep(parent.character.ping)
                bank_store(item.index, emptySlots[i].pack, emptySlots[i].index)
                i++
            }
        }

        // Add items from bank
        for (const pack in parent.character.bank) {
            if (pack == "gold") continue // skip gold
            for (const item of getInventory(parent.character.bank[pack as BankPackType])) {
                // Keep some items
                // TODO: Move this to a variable?
                if (["goldenegg", "luckbooster", "goldbooster", "xpbooster"].includes(item.name)) continue
                if (G.items[item.name].e && item.q >= G.items[item.name].e) {
                    items.push([item.name, -1, pack, item.index])
                    continue
                }
                if (G.items[item.name].s) continue // Don't add stackable items
                if (G.items[item.name].upgrade && item.level >= 8) continue // Don't withdraw high level items
                if (G.items[item.name].compound && item.level >= 4) continue // Don't withdraw high level items

                items.push([item.name, item.level, pack, item.index])
            }
        }

        const empty = getEmptySlots(parent.character.items)
        empty.pop()
        items.sort()

        // Find compounds
        for (let i = 0; i < items.length; i++) {
            const itemI = items[i]

            const indexes: number[] = [i]
            for (let j = i + 1; j < items.length; j++) {
                const itemJ = items[j]
                if (itemJ[0] != itemI[0] || itemJ[1] != itemI[1]) {
                    // The name or level is different
                    i = j - 1
                    break
                }

                // We found another item of the same level
                indexes.push(j)
            }

            if (G.items[itemI[0]].compound && indexes.length >= 4) {
                for (let l = 0; l < 3; l++) {
                    const k = indexes[l]
                    const bankBox = items[k][2]
                    const boxSlot = items[k][3]
                    await sleep(parent.character.ping)
                    if (empty.length)
                        parent.socket.emit("bank", {
                            operation: "swap",
                            inv: empty.shift(),
                            str: boxSlot,
                            pack: bankBox
                        })
                }
            }
        }

        // Find upgrades
        for (let i = 0; i < items.length; i++) {
            const itemI = items[i]

            const indexes: number[] = [i]
            for (let j = i + 1; j < items.length; j++) {
                const itemJ = items[j]
                if (itemJ[0] != itemI[0]) {
                    // The name is different
                    i = j - 1
                    break
                }

                // We found another item of the same level
                indexes.push(j)
            }

            if (G.items[itemI[0]].upgrade && indexes.length >= 2) {
                // We found two of the same weapons, move them to our inventory.
                for (const k of indexes) {
                    const bankBox = items[k][2]
                    const boxSlot = items[k][3]
                    await sleep(parent.character.ping)
                    if (empty.length)
                        parent.socket.emit("bank", {
                            operation: "swap",
                            inv: empty.shift(),
                            str: boxSlot,
                            pack: bankBox
                        })
                }
            }
        }

        // Find exchanges
        for (let i = 0; i < items.length; i++) {
            if (!G.items[items[i][0]].e) continue
            const bankBox = items[i][2]
            const boxSlot = items[i][3]

            await sleep(parent.character.ping)
            if (empty.length)
                parent.socket.emit("bank", {
                    operation: "swap",
                    inv: empty.shift(),
                    str: boxSlot,
                    pack: bankBox
                })
        }

        // Find sellable items
        for (let i = 0; i < items.length; i++) {
            if (!this.itemsToSell[items[i][0]] || items[i][1] > this.itemsToSell[items[i][0]]) continue
            const bankBox = items[i][2]
            const boxSlot = items[i][3]

            await sleep(parent.character.ping)
            if (empty.length)
                parent.socket.emit("bank", {
                    operation: "swap",
                    inv: empty.shift(),
                    str: boxSlot,
                    pack: bankBox
                })
        }

        this.didBankStuff = Date.now()
    }

    private luckedCharacters: { [T in string]: number } = {}
    private async luckLoop(): Promise<void> {
        try {
            if (parent.character.mp < 10) {
                setTimeout(() => { this.luckLoop() }, getCooldownMS("mluck"))
                return
            }

            if (!parent.character.s.mluck || parent.character.s["mluck"].ms < 10000 || parent.character.s["mluck"].f != parent.character.name) {
                // Luck ourself
                use_skill("mluck", parent.character)
                await sleep(G.skills["mluck"].cooldown)
            }

            // Luck others
            for (const id in parent.entities) {
                const luckTarget = parent.entities[id]

                if (!isPlayer(luckTarget) // not a player
                    || distance(parent.character, luckTarget) > G.skills.mluck.range // out of range
                    || !isAvailable("mluck")) // On cooldown
                    continue
                if (this.luckedCharacters[luckTarget.name] && this.luckedCharacters[luckTarget.name] > Date.now() - parent.character.ping * 2) continue // Prevent spamming luck
                if (!luckTarget.s || !luckTarget.s["mluck"] || luckTarget.s["mluck"].ms < 3540000 /* 59 minutes */ || luckTarget.s["mluck"].f != parent.character.name) {
                    this.luckedCharacters[luckTarget.name] = Date.now()
                    use_skill("mluck", luckTarget)
                    await sleep(G.skills["mluck"].cooldown)
                }
            }
        } catch (error) {
            console.error(error)
            // NOTE: 2019-12-22 There has been a few instances of an entity not having a .type attribute?
            console.error(parent.entities)
        }

        setTimeout(() => { this.luckLoop() }, getCooldownMS("mluck"))
    }
}

export const merchant = new Merchant()