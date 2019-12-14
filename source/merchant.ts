import { Character } from './character'
import { MonsterType, ItemName, IPositionReal, IEntity, BankPackType } from './definitions/adventureland';
import { upgradeIfMany, compoundIfMany } from './upgrade'
import { sellUnwantedItems, exchangeItems, buyFromPonty, openMerchantStand, closeMerchantStand } from './trade';
import { getInventory, isPlayer, getCooldownMS, isAvailable, getEmptyBankSlots } from './functions';

class Merchant extends Character {
    targetPriority = {}
    mainTarget: MonsterType = null;

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
                return { message: "Full!", target: { "map": "bank", "x": 0, "y": -37 } }
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
                this.pathfinder.movementTarget = mtype;
                for (let id in parent.entities) {
                    let entity = parent.entities[id]
                    if (entity.mtype == mtype) {
                        // There's one nearby
                        return { message: "EV " + mtype, target: null }
                    }
                }
                return { message: "EV " + mtype, target: parent.S[mtype as MonsterType] }
            }
        }

        // TODO: If Angel and Kane haven't been seen in a while, go find them

        // If someone in our party isn't mlucked by us, go find them and mluck them.
        for (let name in this.info.party) {
            if (name == parent.character.name) continue; // Don't move to ourself

            let player = this.info.party[name]
            if (player && player.s && (!player.s.mluck || player.s.mluck.f !== "earthMer")) {
                return { message: "ML " + name, target: player }
            }
        }

        // If there are players who we have seen recently that haven't been mlucked, go find them and mluck them
        for (let name in this.info.players) {
            let player = this.info.players[name]
            if (distance(parent.character, player) < 10 && !player.s.mluck) {
                // This player moved.
                delete this.info.players[name];
                break
            } else if (!player.s.mluck && !player.rip) {
                return { message: "ML Other", target: this.info.players[name] }
            }
        }

        // If our players have lots of items, go offload
        for (let name in this.info.party) {
            if (name == parent.character.name) continue; // Skip ourself
            let player = this.info.party[name]
            if (player && player.items.length > 20) {
                return { message: "INV " + name, target: player }
            }
        }

        // If we haven't been to the bank in a while, go
        if (Date.now() - this.didBankStuff > 120000) {
            return { message: "Bank", target: { "map": "bank", "x": 0, "y": -37 } }
        } else {
            // Default spot in town to hang out
            return { message: "Vendor", target: { map: "main", "x": 60, "y": -325 } }
        }
    }

    protected mainLoop(): void {
        try {
            sellUnwantedItems();
            // exchangeItems();

            this.bankStuff();

            if (distance(parent.character, { map: "main", "x": 60, "y": -325 }) < 100) {
                openMerchantStand()
            } else {
                closeMerchantStand()
            }

            // buyAndUpgrade("bow", 9, 1)

            upgradeIfMany(8);
            compoundIfMany(4);

            super.mainLoop();
        } catch (error) {
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 1000);
        }
    }

    public run(): void {
        this.healLoop();
        this.scareLoop();
        this.moveLoop();
        this.sendInfoLoop();
        this.mainLoop();
        this.luckLoop();
        this.pontyLoop();
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
            setTimeout(() => { this.pontyLoop() }, 250);
            return;
        }

        buyFromPonty(["strbelt", "strring", "intbelt", "intring", "dexbelt", "dexring", // High priority things
            "intearring", "dexearring", "strearring", "dexamulet", "intamulet", // Low priority things
            /* "wgloves", "wshoes", "wattire", // I want to get all +8 for my ranger */
            "bfur", // Craftables that are usable for things
            "pmace", // I want a nice mace for my priest
            "5bucks", "candy0", "candy1", "candycane", "gem0", "gem1", "leather", "mistletoe", "monstertoken", "ornament", "seashell", // Exchangables
            "lostearring", "jacko", "cape", "bcape", "t2bow", "cupid", "candycanesword", "merry", "ornamentstaff", "merry", "bowofthedead", "gbow", "hbow", "t2quiver", "oozingterror", "talkingskull", "greenbomb", "xboots", "handofmidas", "goldenpowerglove", "xgloves", "powerglove", "poker", "starkillers", "xpants", "xarmor", "xhelmet", "fury", "partyhat"]); // Other things

        // We bought things from Ponty, wait a long time before trying to buy again.
        setTimeout(() => { this.pontyLoop() }, 15000);
    }

    private didBankStuff = 0;
    private bankStuff(): void {
        if (parent.character.map !== "bank") {
            return;
        } else if (Date.now() - this.didBankStuff < 10000) {
            return;
        }
        let itemsToKeep: ItemName[] = ["tracker", "cscroll0", "cscroll1", "cscroll2", "scroll0", "scroll1", "scroll2", "stand0", "dexscroll", "intscroll", "strscroll", "monstertoken", "candycane", "mistletoe", "gem0", "gem1", "candy0", "candy1", "armorbox", "weaponbox"]

        // Store extra gold
        if (parent.character.gold > 25000000) {
            bank_deposit(parent.character.gold - 25000000)
        } else if (parent.character.gold < 25000000) {
            bank_withdraw(25000000 - parent.character.gold)
        }

        // name, level, inventory, slot #
        let items: [ItemName, number, string, number][] = [];

        // Add items from inventory
        getInventory().forEach((item) => {
            if (itemsToKeep.includes(item.name)) return; // Don't add items we want to keep


            if (G.items[item.name].s) {
                // If the item is stackable, deposit it.
                bank_store(item.index)
                return;
            }

            // Add it to our list of items;
            // items.push([item.name, item.level, "items", item.index]);

            // Store all items for now
            let i = 0;
            let emptySlots = getEmptyBankSlots();
            if (i < emptySlots.length) {
                bank_store(item.index, emptySlots[i].pack, emptySlots[i].index)
                i++;
            }
        });

        // Add items from bank
        for (let pack in parent.character.bank) {
            if (pack == "gold") continue; // skip gold
            getInventory(parent.character.bank[pack as BankPackType]).forEach((item) => {
                if (itemsToKeep.includes(item.name)) return; // Don't add items we want to keep
                if (G.items[item.name].s) return; // Don't add stackable items
                if (G.items[item.name].upgrade && item.level >= 8) return; // Don't withdraw high level items
                if (G.items[item.name].compound && item.level >= 4) return; // Don't withdraw high level items
                items.push([item.name, item.level, pack, item.index])
            });
        }

        // Find things that can be upgraded, or exchanged.
        items.sort();
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
                indexes.forEach((k) => {
                    let level = items[k][1];
                    if (level >= 8) return; // Leave high level items
                    let bankBox = items[k][2];
                    let boxSlot = items[k][3];
                    parent.socket.emit("bank", {
                        operation: "swap",
                        inv: -1,
                        str: boxSlot,
                        pack: bankBox
                    });
                })
            }
        }

        for (let i = 0; i < items.length; i++) {
            let itemI = items[i];

            let indexes: number[] = [i];
            for (let j = i + 1; j < items.length; j++) {
                let itemJ = items[j]
                if (itemJ[0] != itemI[0] || itemJ[1] != itemI[1]) {
                    // The name or level is different
                    i = j - 1;
                    break;
                }

                // We found another item of the same level
                indexes.push(j);
            }

            if (G.items[itemI[0]].compound && indexes.length >= 3) {
                for (let l = 0; l < 3; l++) {
                    let k = indexes[l];
                    let level = items[k][1];
                    if (level >= 4) return; // Leave high level items
                    let bankBox = items[k][2];
                    let boxSlot = items[k][3];
                    parent.socket.emit("bank", {
                        operation: "swap",
                        inv: -1,
                        str: boxSlot,
                        pack: bankBox
                    });
                }
            }
        }

        this.didBankStuff = Date.now();
    }

    private luckedCharacters: any = {}
    private luckLoop(): void {
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
                    break;
                }
            }
        }

        setTimeout(() => { this.luckLoop() }, Math.max(100, getCooldownMS("mluck")));
    }
}

export let merchant = new Merchant();