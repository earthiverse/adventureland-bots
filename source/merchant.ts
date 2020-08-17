import { Character } from "./character"
import { MonsterName, PositionReal, BankPackType } from "./definitions/adventureland"
import { upgradeIfMany, compoundIfMany, upgradeItem } from "./upgrade"
import { sellUnwantedItems, exchangeItems, buyFromPonty, openMerchantStand, closeMerchantStand, buyScrolls } from "./trade"
import { getInventory, isPlayer, getCooldownMS, isAvailable, getEmptyBankSlots, sleep, getEmptySlots, isInventoryFull, buyIfNone, findItem } from "./functions"
import { MovementTarget, TargetPriorityList, BankItemInfo, NPCInfo, PartyInfo, PlayersInfo, MonstersInfo } from "./definitions/bots"
import { getPartyInfo, getPlayersInfo, setPlayersInfo, getNPCInfo, setNPCInfo, getMonstersInfo, setMonstersInfo } from "./info"
import { NGraphMove } from "./ngraphmove"

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
    mainTarget: MonsterName = null;

    constructor() {
        super()

        // Remove weapons and armor, we don't switch as a merchant
        this.itemsToKeep.splice(this.itemsToKeep.indexOf("jacko"), 1)
        this.itemsToKeep.splice(this.itemsToKeep.indexOf("lantern"), 1)
        this.itemsToKeep.splice(this.itemsToKeep.indexOf("orbg"), 1)
        this.itemsToKeep.splice(this.itemsToKeep.indexOf("test_orb"), 1)

        this.itemsToKeep.push(
            "cscroll0", "cscroll1", "cscroll2",
            "scroll0", "scroll1", "scroll2",
            "stand0",
            "dexscroll", "intscroll", "strscroll",
            "monstertoken",

            // Temporary
            "platinumnugget",
            "bow"
        )
    }

    protected getMovementTarget(): MovementTarget {
        if (parent.character.rip) {
            set_message("RIP")
            return
        }

        let vendorPlace: PositionReal
        if (is_pvp()) {
            vendorPlace = { map: "woffice", "x": 0, "y": 0 }
        } else {
            vendorPlace = { map: "main", "x": -750, "y": 1750 }
        }

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
            const info = parent.S[mtype as MonsterName]
            if (!info.live) continue // Not alive
            if (info.hp > info.max_hp / 2) continue // Not low health
            if (!info.target) continue // Not targeting anyone, nobody is probably attacking it
            set_message(mtype)
            return { target: mtype as MonsterName, position: info, range: 50 }
        }

        // If someone in our party isn't mlucked by us, go find them and mluck them.
        const party: PartyInfo = getPartyInfo()
        for (const name in party) {
            if (name == parent.character.name) continue // Don't move to ourself

            const player = parent.entities[name] ? parent.entities[name] : party[name]
            if (player && player.s && (!player.s.mluck || player.s.mluck.f != parent.character.id)) {
                set_message(`ML ${name}`)
                return { position: player, range: G.skills.mluck.range - 20 }
            }
        }

        // If there are players who we have seen recently that haven't been mlucked, go find them and mluck them
        const players: PlayersInfo = getPlayersInfo()
        for (const name in players) {
            if (name == parent.character.name) continue // Skip ourself
            const player = parent.entities[name] ? parent.entities[name] : players[name]
            if (distance(parent.character, player) <= G.skills.mluck.range && (!player.s.mluck || Date.now() - players[name].lastSeen.getTime() > 3000000 || player.s.mluck.ms < 1800000)) {
                // This player moved.
                delete players[name]
                setPlayersInfo(players)
                break
            } else if ((!player.s.mluck || Date.now() - players[name].lastSeen.getTime() > 3000000 || player.s.mluck.ms < 1800000) && !player.rip) {
                set_message(`ML ${name}`)
                return { position: player, range: G.skills.mluck.range - 20 }
            }
        }

        // If our players have lots of items, go offload
        for (const name in party) {
            if (name == parent.character.name) continue // Skip ourself
            const player = party[name]
            if (player && player.items.length > 20) {
                set_message(`INV ${name}`)
                return { position: player, range: 240 }
            }
        }

        // If we haven't been to the bank in a while, go
        if (Date.now() - this.didBankStuff > 240000 || Date.now() - this.didBankStuff < 5000 + Math.max(...parent.pings) * 5) {
            set_message("Bank")
            return { position: { "map": "bank", "x": 0, "y": -400 } }
        }

        // If Angel and Kane haven't been seen in a while, go find them to update their position
        // TODO: If we're near them and can't see them, delete them from the info.
        const npcs: NPCInfo = getNPCInfo()
        if (npcs.Kane && Date.now() - npcs.Kane.lastSeen.getTime() > 240000) {
            if (distance(parent.character, npcs.Kane) < parent.character.range * 2 && !parent.entities.Kane) {
                // We can't find Kane, our information is too old...
                delete npcs.Kane
                setNPCInfo(npcs)
            } else {
                set_message("Find Kane")
                return { position: npcs.Kane }
            }
        } else if (npcs.Angel && Date.now() - npcs.Angel.lastSeen.getTime() > 240000) {
            if (distance(parent.character, npcs.Angel) < parent.character.range * 2 && !parent.entities.Angel) {
                // We can't find Angel, our information is too old...
                delete npcs.Angel
                setNPCInfo(npcs)
            } else {
                set_message("Find Angel")
                return { position: npcs.Angel }
            }
        }

        // Special Monsters -- Move to monster
        const monsters: MonstersInfo = getMonstersInfo()
        for (const mtype in monsters) {
            const info = monsters[mtype as MonsterName]

            // Update info if we can see it
            const entityInfo = parent.entities[info.id]
            if (entityInfo) {
                info.x = entityInfo.real_x
                info.y = entityInfo.real_y
            }

            if (distance(parent.character, info) < parent.character.range * 2 && !entityInfo) {
                // We got close to it, but we can't see it...
                delete monsters[mtype as MonsterName]
                setMonstersInfo(monsters)
            } else {
                // TEMPORARY -- don't go to special monsters while we're farming crabx's.
                // set_message(`SP ${mtype}`)
                // return { target: mtype as MonsterName, position: info, range: parent.character.range }
            }
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

            await this.newBankStuff()

            if (!parent.character.moving) {
                openMerchantStand()
            } else {
                closeMerchantStand()
            }

            upgradeIfMany(8)
            compoundIfMany(4)

            // Sell MH coins
            let tokens = findItem("monstertoken")
            if (tokens.q > 1) {
                // Put the tokens in the inventory
                unequip("trade1")
                await sleep(Math.min(...parent.pings))

                // Put the tokens back in the trade slot
                tokens = findItem("monstertoken")
                trade(tokens.index, "trade1", 1000000, tokens.q - 1)
                await sleep(Math.min(...parent.pings))
            }

            // I want a +10 bow eventually
            // await buyIfNone("bow", 9, 4)
            // await upgradeItem("bow", 9)

            await buyScrolls()

            await super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(async () => { this.mainLoop() }, 1000)
        }
    }

    public async run() {
        await this.lootSetup()
        this.attackLoop()
        this.healLoop()
        this.scareLoop()
        await this.moveSetup()
        this.moveLoop()
        await this.infoSetup()
        this.infoLoop()
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
    private async newBankStuff(): Promise<void> {
        if (parent.character.map != "bank") {
            return
        } else if (Date.now() - this.didBankStuff < 120000) {
            return
        }

        // Store extra gold
        if (parent.character.gold > 100000000) {
            bank_deposit(parent.character.gold - 100000000)
        } else if (parent.character.gold < 100000000) {
            bank_withdraw(100000000 - parent.character.gold)
        }

        // Deposit as many items as we can in to our bank
        let emptyBankSlots = getEmptyBankSlots()
        for (const item of getInventory()) {
            if (emptyBankSlots.length == 0) break
            if (this.itemsToKeep.includes(item.name)) continue

            // See if we can stack it on something else
            if (item.q) {
                let found = false
                for (const pack in bank_packs) {
                    if (found) break
                    if (bank_packs[pack as BankPackType][0] !== parent.character.map) continue
                    for (const item2 of getInventory(parent.character.bank[pack as BankPackType])) {
                        if (item.name == item2.name
                            && item.q + item2.q <= G.items[item.name].s) {
                            bank_store(item.index, pack as BankPackType, item2.index)
                            found = true
                            break
                        }
                    }
                }
                if (found) continue
            }

            const slot = emptyBankSlots.shift()
            bank_store(item.index, slot.pack, slot.index)
        }

        // Get a list of all of our items in our inventory and bank, then sort them so we can compare them
        await sleep(Math.max(...parent.pings))
        const allItems: BankItemInfo[] = []
        for (const item of getInventory()) {
            if (this.itemsToKeep.includes(item.name)) continue // We want to keep this item on us
            allItems.push({ ...item, pack: "items" })
        }
        for (const pack in bank_packs) {
            if (pack == "gold") continue
            if (bank_packs[pack as BankPackType][0] !== parent.character.map) continue
            for (const item of getInventory(parent.character.bank[pack as BankPackType])) {
                allItems.push({ ...item, pack: pack as BankPackType })
            }
        }
        allItems.sort((a, b) => {
            if (a.name < b.name) return -1 // 1. Sort by item name (alphabetical)
            if (a.name > b.name) return 1
            if (a.p && !b.p) return -1 // 2. Sort by modifier (alphabetical)
            if (a.p && b.p) {
                if (a.p < b.p) return -1
                if (a.p > b.p) return 1
            }
            if (a.level > b.level) return -1 // 3. Sort by item level (higher first)
            if (a.level < b.level) return 1
            if (a.q && b.q) {
                if (a.q > b.q) return -1 // 4. If stackable, sort by # of items in stack (higher first)
                if (a.q < b.q) return 1
            }
            return 0
        })

        // Functions to help decide what to do
        function canCombine(a: BankItemInfo, b: BankItemInfo, c: BankItemInfo, d: BankItemInfo): boolean {
            if (a.name != b.name || a.name != c.name || a.name != d.name) return false // Different item
            if (a.p != b.p || a.p != c.p || a.p != d.p) return false // Different modifier (shiny, glitched, etc.)
            if (b.level != c.level || b.level != d.level) return false // Different level
            if (!G.items[a.name].compound) return false // Not compoundable
            if (b.level >= Number.parseInt(process.env.COMBINE_TO_LEVEL)) return false
            return true
        }
        function canUpgrade(a: BankItemInfo, b: BankItemInfo): boolean {
            if (a.name != b.name) return false // Different item
            if (a.p != b.p) return false // Different modifier (shiny, glitched, etc.)
            if (!G.items[a.name].upgrade) return false // Not upgradable
            if (b.level >= Number.parseInt(process.env.UPGRADE_TO_LEVEL)) return false // Too high of a level
            return true
        }
        function isSameStackable(a: BankItemInfo, b: BankItemInfo): boolean {
            if (a.name != b.name) return false
            if (!a.q) return false
            return true
        }
        const wantToSell = (a: BankItemInfo): boolean => {
            if (!this.itemsToSell[a.name]) return false // Not an item we want to sell
            if (a.level && a.level > this.itemsToSell[a.name]) return false // Higher level than we want to sell
            if (a.p) return false // Item has a special modifier
            return true
        }

        // Deposit stackable items from our inventory to our bank storage
        await sleep(Math.max(...parent.pings))
        let emptySlots = getEmptySlots(parent.character.items)
        for (let i = 1; i < allItems.length; i++) {
            if (emptySlots.length < 3) break
            const itemA = allItems[i - 1]
            const itemB = allItems[i]
            if (isSameStackable(itemA, itemB)) {
                const stackLimit = G.items[itemA.name].s
                if (itemA.q + itemB.q < stackLimit) {
                    if (itemA.pack != "items" && itemB.pack == "items") {
                        // ItemB is in our inventory, we can just swap it on to itemA
                        parent.socket.emit("bank", {
                            operation: "swap",
                            inv: itemB.index,
                            str: -1,
                            pack: itemA.pack
                        })
                    } else if (itemA.pack == "items" && itemB.pack == "items") {
                        // ItemA and ItemB are both in our inventory
                        parent.socket.emit("imove", {
                            a: itemA.index,
                            b: itemB.index
                        })
                    } else {
                        // Both items are in the bank, kind of out of scope, but let's combine them while we're here...
                        const empty1 = emptySlots.shift()
                        parent.socket.emit("bank", {
                            operation: "swap",
                            inv: -1,
                            str: itemA.index,
                            pack: itemA.pack
                        })
                        parent.socket.emit("bank", {
                            operation: "swap",
                            inv: -1,
                            str: itemB.index,
                            pack: itemB.pack
                        })
                        await sleep(Math.max(...parent.pings))
                        parent.socket.emit("bank", {
                            operation: "swap",
                            inv: empty1,
                            str: itemA.index,
                            pack: itemA.pack
                        })
                    }
                }

                allItems.splice(i - 1, 2)
                i -= 1
            }
        }

        // Find things we can combine, and move them to our inventory
        await sleep(Math.max(...parent.pings))
        emptySlots = getEmptySlots(parent.character.items)
        for (let i = 3; i < allItems.length; i++) {
            if (emptySlots.length < 5) break // Leave at least one empty slot
            const itemA = allItems[i - 3]
            const itemB = allItems[i - 2]
            const itemC = allItems[i - 1]
            const itemD = allItems[i]
            if (canCombine(itemA, itemB, itemC, itemD)) {
                // Move the three items to our inventory
                if (itemA.pack != "items") {
                    parent.socket.emit("bank", {
                        operation: "swap",
                        inv: emptySlots.shift(),
                        str: itemA.index,
                        pack: itemA.pack
                    })
                }
                if (itemA.pack != "items") {
                    parent.socket.emit("bank", {
                        operation: "swap",
                        inv: emptySlots.shift(),
                        str: itemB.index,
                        pack: itemB.pack
                    })
                }
                if (itemB.pack != "items") {
                    parent.socket.emit("bank", {
                        operation: "swap",
                        inv: emptySlots.shift(),
                        str: itemC.index,
                        pack: itemC.pack
                    })
                }
                if (itemC.pack != "items") {
                    parent.socket.emit("bank", {
                        operation: "swap",
                        inv: emptySlots.shift(),
                        str: itemD.index,
                        pack: itemD.pack
                    })
                }
                allItems.splice(i - 2, 3)
                i -= 1
            }
        }

        // Find things we should upgrade, and move them to our inventory
        // TODO: Improve this so we can pull out 3 items if we have 3 of the same items...
        // NOTE: It will still probably upgrade everything eventually... Might just take a few bank visits
        for (let i = 1; i < allItems.length; i++) {
            if (emptySlots.length < 3) break // Leave at least one empty slot
            const itemA = allItems[i - 1]
            const itemB = allItems[i]
            if (canUpgrade(itemA, itemB)) {
                // Move the two items to our inventory
                if (itemA.pack != "items") {
                    parent.socket.emit("bank", {
                        operation: "swap",
                        inv: emptySlots.shift(),
                        str: itemA.index,
                        pack: itemA.pack
                    })
                }
                if (itemB.pack != "items") {
                    parent.socket.emit("bank", {
                        operation: "swap",
                        inv: emptySlots.shift(),
                        str: itemB.index,
                        pack: itemB.pack
                    })
                }
                allItems.splice(i - 1, 2)
                i -= 1
            }
        }

        // Find things we should sell
        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i]
            if (emptySlots.length < 2) break // Leave at least one empty slot
            if (wantToSell(item)) {
                if (item.pack != "items") {
                    parent.socket.emit("bank", {
                        operation: "swap",
                        inv: emptySlots.shift(),
                        str: item.index,
                        pack: item.pack
                    })
                }
                allItems.splice(i, 1)
                i -= 1
            }
        }

        // Find things we should exchange
        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i]
            if (emptySlots.length < 2) break // Leave at least one empty slot
            if (item.pack == "items") {
                // This item is already in our inventory
                allItems.splice(i, 1)
                i -= 1
                continue
            }
            if (!this.itemsToExchange.has(item.name)) continue // We don't want to exchange this item
            if (item.q < G.items[item.name].e) continue // Not enough to exchange

            parent.socket.emit("bank", {
                operation: "swap",
                inv: emptySlots.shift(),
                str: item.index,
                pack: item.pack
            })
            allItems.splice(i, 1)
            i -= 1
        }

        // NOTE: TEMPORARY
        // Deposit all level 9 (or higher?) bows, and move other bows to the back of the inventory
        await sleep(Math.max(...parent.pings))
        emptyBankSlots = getEmptyBankSlots()
        for (const item of getInventory()) {
            if (item.name != "bow") continue
            if (item.level < 9) {
                if (emptySlots.length) {
                    const slot = emptySlots.pop()
                    if (item.index < slot) swap(item.index, slot)
                }
                continue
            }
            const slot = emptyBankSlots.shift()
            bank_store(item.index, slot.pack, slot.index)
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