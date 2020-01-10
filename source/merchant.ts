import { Character } from './character'
import { MonsterType, ItemName, IPositionReal, IEntity, BankPackType } from './definitions/adventureland';
import { upgradeIfMany, compoundIfMany, upgradeItem } from './upgrade'
import { sellUnwantedItems, exchangeItems, buyFromPonty, openMerchantStand, closeMerchantStand, dismantleItems, buyScrolls } from './trade';
import { getInventory, isPlayer, getCooldownMS, isAvailable, getEmptyBankSlots, sleep, buyIfNone, getEmptySlots } from './functions';

class Merchant extends Character {
    targets = {
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

    public getMovementTarget(): { message: string, target: IPositionReal } {
        // Check for full inventory
        let full = true;
        for (let i = 0; i < 42; i++) {
            if (parent.character.items[i]) continue;
            full = false;
            break;
        }
        if (full) {
            if (parent.character.map == "bank") {
                // Already at the bank
                return { message: "Full!", target: null }
            } else {
                // Move to the bank
                return { message: "Full!", target: { "map": "bank", "x": 0, "y": -400 } }
            }
        }

        // Check for Christmas Tree
        if (G.maps.main.ref.newyear_tree && !parent.character.s.holidayspirit) {
            return { message: "Xmas Tree", target: G.maps.main.ref.newyear_tree }
        }

        // Check for event monsters
        for (let mtype in parent.S) {
            let monster = parent.S[mtype as MonsterType]
            if (monster.hp < monster.max_hp * 0.9
                && monster.live) {
                this.pathfinder.movementTarget = mtype as MonsterType;
                for (let id in parent.entities) {
                    let entity = parent.entities[id]
                    if (entity.mtype == mtype) {
                        // There's one nearby
                        if (distance(parent.character, entity) > 100)
                            return { message: "EV " + mtype, target: entity }
                        else
                            return { message: "EV " + mtype, target: null }
                    }
                }
                return { message: "EV " + mtype, target: parent.S[mtype as MonsterType] }
            }
        }

        // If someone in our party isn't mlucked by us, go find them and mluck them.
        for (let name of parent.party_list) {
            if (name == parent.character.name) continue; // Don't move to ourself

            let player = parent.entities[name] ? parent.entities[name] : this.info.party[name]
            if (player && player.s && (!player.s.mluck || player.s.mluck.f != "earthMer")) {
                return { message: "ML " + name, target: player }
            }
        }

        // If there are players who we have seen recently that haven't been mlucked, go find them and mluck them
        for (let name in this.info.players) {
            let player = parent.entities[name] ? parent.entities[name] : this.info.players[name]
            if (distance(parent.character, player) <= 10 && !player.s.mluck) {
                // This player moved.
                delete this.info.players[name];
                break
            } else if (!player.s.mluck && !player.rip) {
                return { message: "ML Other", target: this.info.players[name] }
            }
        }

        // If our players have lots of items, go offload
        for (let name of parent.party_list) {
            if (name == parent.character.name) continue; // Skip ourself
            let player = this.info.party[name]
            if (player && player.items.length > 20) {
                return { message: "INV " + name, target: player }
            }
        }

        // If we haven't been to the bank in a while, go
        if (Date.now() - this.didBankStuff > 120000) {
            return { message: "Bank", target: { "map": "bank", "x": 0, "y": -400 } }
        }

        // If Angel and Kane haven't been seen in a while, go find them to update their position
        if (this.info.npcs.Kane && Date.now() - new Date(this.info.npcs.Kane.lastSeen).getTime() > 300000) {
            return { message: "Find Kane", target: this.info.npcs.Kane }
        } else if (this.info.npcs.Angel && Date.now() - new Date(this.info.npcs.Angel.lastSeen).getTime() > 300000) {
            return { message: "Find Angel", target: this.info.npcs.Angel }
        }

        // NOTE: We have a computer now, we don't need to travel anymore
        // // If we have exchangable things, go exchange them
        // let items = getInventory();
        // if (items.length < 25) {
        //     for (let item of items) {
        //         if (G.items[item.name].quest && item.q >= G.items[item.name].e) {
        //             return { message: "Quest", target: G.quests[item.name] }
        //         }
        //     }
        // }

        // Default vendoring
        if (this.info.npcs.Kane) {
            return { message: "Vendor", target: this.info.npcs.Kane }
        } else if (this.info.npcs.Angel) {
            return { message: "Vendor", target: this.info.npcs.Angel }
        } else {
            return { message: "Vendor", target: { map: "main", "x": 60, "y": -325 } }
        }
    }

    protected async mainLoop(): Promise<void> {
        try {
            sellUnwantedItems(this.itemsToSell);

            let numItems = 0;
            for (let i = 0; i < 42; i++) if (parent.character.items[i]) numItems++

            if (numItems < 25)
                exchangeItems();

            await this.bankStuff();

            if (!smart.moving && (distance(parent.character, { map: "main", "x": 60, "y": -325 }) < 100
                || (this.info.npcs.Angel && distance(parent.character, this.info.npcs.Angel) < 100))
                || (this.info.npcs.Kane && distance(parent.character, this.info.npcs.Kane) < 100)) {
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
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 1000)
        }
    }

    public run(): void {
        this.attackLoop()
        this.healLoop()
        this.scareLoop()
        this.moveLoop()
        this.sendInfoLoop()
        this.mainLoop()
        this.luckLoop()
        this.pontyLoop()
    }

    private pontyLoop(): void {
        let foundPonty = false;
        for (let npc of parent.npcs) {
            if (npc.id == "secondhands" && distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundPonty = true;
                break;
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
    private async bankStuff() {
        if (parent.character.map != "bank") {
            return;
        } else if (Date.now() - this.didBankStuff < 10000) {
            return;
        }

        // Store extra gold
        if (parent.character.gold > 100000000) {
            bank_deposit(parent.character.gold - 100000000)
        } else if (parent.character.gold < 100000000) {
            bank_withdraw(100000000 - parent.character.gold)
        }

        // name, level, inventory, slot #
        let items: [ItemName, number, string, number][] = [];

        // Add items from inventory
        for (let item of getInventory()) {
            if (this.itemsToKeep.includes(item.name)) continue; // Don't add items we want to keep


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
            let emptySlots = getEmptyBankSlots()
            if (i < emptySlots.length) {
                await sleep(parent.character.ping)
                bank_store(item.index, emptySlots[i].pack, emptySlots[i].index)
                i++
            }
        }

        // Add items from bank
        for (let pack in parent.character.bank) {
            if (pack == "gold") continue; // skip gold
            for (let item of getInventory(parent.character.bank[pack as BankPackType])) {
                // Keep some items
                // TODO: Move this to a variable?
                if (["goldenegg", "luckbooster", "goldbooster", "xpbooster"].includes(item.name)) continue
                if (G.items[item.name].e && item.q >= G.items[item.name].e) {
                    items.push([item.name, -1, pack, item.index])
                    continue
                }
                if (G.items[item.name].s) continue; // Don't add stackable items
                if (G.items[item.name].upgrade && item.level >= 8) continue; // Don't withdraw high level items
                if (G.items[item.name].compound && item.level >= 4) continue; // Don't withdraw high level items
                // if (item_grade(item) >= 2) continue; // Don't withdraw high level items

                if (["goldenegg", "luckbooster", "goldbooster", "xpbooster"].includes(item.name)) continue

                items.push([item.name, item.level, pack, item.index])
            }
        }

        let empty = getEmptySlots(parent.character.items)
        empty.pop()
        items.sort()

        // Find compounds
        for (let i = 0; i < items.length; i++) {
            let itemI = items[i]

            let indexes: number[] = [i]
            for (let j = i + 1; j < items.length; j++) {
                let itemJ = items[j]
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
                    let k = indexes[l]
                    let bankBox = items[k][2]
                    let boxSlot = items[k][3]
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
            let itemI = items[i];

            let indexes: number[] = [i];
            for (let j = i + 1; j < items.length; j++) {
                let itemJ = items[j]
                if (itemJ[0] != itemI[0]) {
                    // The name is different
                    i = j - 1;
                    break;
                }

                // We found another item of the same level
                indexes.push(j);
            }

            if (G.items[itemI[0]].upgrade && indexes.length >= 2) {
                // We found two of the same weapons, move them to our inventory.
                for (let k of indexes) {
                    let level = items[k][1];
                    let bankBox = items[k][2];
                    let boxSlot = items[k][3];
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
            let bankBox = items[i][2]
            let boxSlot = items[i][3]

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
            if (!this.itemsToSell[items[i][0]]) continue
            let bankBox = items[i][2]
            let boxSlot = items[i][3]

            await sleep(parent.character.ping)
            if (empty.length)
                parent.socket.emit("bank", {
                    operation: "swap",
                    inv: empty.shift(),
                    str: boxSlot,
                    pack: bankBox
                })
        }

        this.didBankStuff = Date.now();
    }

    private luckedCharacters: any = {}
    private async luckLoop(): Promise<void> {
        try {
            if (parent.character.mp < 10) {
                // Do nothing
            } else if (!parent.character.s.mluck || parent.character.s["mluck"].ms < 10000 || parent.character.s["mluck"].f != parent.character.name) {
                // Luck ourself
                use_skill("mluck", parent.character);
            } else {
                // Luck others
                for (let id in parent.entities) {
                    let luckTarget = parent.entities[id];

                    if (!isPlayer(luckTarget) // not a player
                        || distance(parent.character, luckTarget) > 250 // out of range
                        || !isAvailable("mluck")) // On cooldown
                        continue;
                    if (this.luckedCharacters[luckTarget.name] && this.luckedCharacters[luckTarget.name] > Date.now() - parent.character.ping * 2) continue; // Prevent spamming luck
                    if (!luckTarget.s || !luckTarget.s["mluck"] || luckTarget.s["mluck"].ms < 3540000 /* 59 minutes */ || luckTarget.s["mluck"].f != parent.character.name) {
                        this.luckedCharacters[luckTarget.name] = Date.now();
                        use_skill("mluck", luckTarget);
                        await sleep(G.skills["mluck"].cooldown);
                    }
                }
            }
        }
        catch (error) {
            console.error(error)
            // NOTE: 2019-12-22 There has been a few instances of an entity not having a .type attribute?
            console.error(parent.entities)
        }

        setTimeout(() => { this.luckLoop() }, getCooldownMS("mluck"));
    }
}

export let merchant = new Merchant();