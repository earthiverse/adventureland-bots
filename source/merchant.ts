import { Character } from './character'
import { MonsterName, ItemName, ALPosition, Monster } from './definitions/adventureland';
import { compoundItem, upgradeItem, upgradeIfMany, compoundIfMany } from './upgrade'
import { sellUnwantedItems, exchangeItems, buyFromPonty } from './trade';
import { getInventory, buyAndUpgrade } from './functions';

class Merchant extends Character {
    targetPriority = {}
    mainTarget: MonsterName = null;

    public getMovementTarget(): ALPosition {
        // Check for full inventory
        let full = true;
        for (let i = 0; i < 42; i++) {
            if (parent.character.items[i]) continue;
            full = false;
            break;
        }
        if (full) {
            set_message("Full!")
            if (parent.character.map == "bank") {
                // Already at the bank
                return;
            } else {
                // Move to the bank
                return { "map": "bank", "x": 0, "y": 0 }
            }
        }

        // Check for Christmas Tree
        if (G.maps.main.ref.newyear_tree && !character.s.holidayspirit) {
            this.pathfinder.movementTarget = "newyear_tree";
            this.pathfinder.movementTarget = "newyear_tree";
            return G.maps.main.ref.newyear_tree
        }

        // Check for event monsters
        for (let name in parent.S) {
            let monster: any = parent.S[name as MonsterName]
            if (monster.hp < monster.max_hp * 0.9
                && monster.live) {
                set_message("EV " + name.slice(0, 8))
                this.pathfinder.movementTarget = name;
                for (let id in parent.entities) {
                    let entity = parent.entities[id]
                    if (entity.mtype == name) {
                        // There's one nearby
                        return;
                    }
                }
                return parent.S[name as MonsterName]
            }
        }

        // TODO: If Angel and Kane haven't been seen in a while, go find them

        // If our players aren't mlucked, go find them and mluck them.
        for(let name of parent.party_list) {
            let player = this.partyInfo[name]
            if(player && player.s && (!player.s.mluck || player.s.mluck.f !== "earthMer")) {
                set_message("MLuck party")
                return player
            }
        }

        // If there are players who we have seen recently that haven't been mlucked, go find them and mluck them
        for (let name in this.otherInfo) {
            let player = this.otherInfo[name]
            if (player.s && !player.s.mluck) {
                set_message("MLuck other")
                return this.otherInfo[name]
            }
        }

        // If our players have lots of items, go offload
        for(let name of parent.party_list) {
            let player = this.partyInfo[name]
            if(player && player.inventory.length > 30) {
                set_message("Offloading!")
                return player
            }
        }

        // Default spot in town to hang out
        set_message("Vendoring!")
        return { map: "main", "x": 60, "y": -325 }
    }

    protected mainLoop(): void {
        try {
            sellUnwantedItems();
            exchangeItems();

            this.bankStuff();

            // buyAndUpgrade("bow", 8, 5)

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
            if (npc.id == "secondhands" && distance(character, {
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

        buyFromPonty([/*"strbelt", "strring", "intbelt",*/ "intring", "dexbelt", "dexring", // High priority things
            /*"intearring",*/ "dexearring", /*"strearring", "dexamulet", "intamulet",*/ // Low priority things
            "wgloves", "wshoes", "wattire",  // I want to get all +8 for my ranger
            "bfur", "leather", "seashell", // Craftables that are usable for things
            "pmace", // I want a nice mace for my priest
            "candycane", "ornament",
            "lostearring", "jacko", "cape", "bcape", "monstertoken", "t2bow", "cupid", "candycanesword", "merry", "ornamentstaff", "merry", "bowofthedead", "gbow", "hbow", "t2quiver", "oozingterror", "talkingskull", "greenbomb", "gem0", "gem1", "candy0", "candy1", "xboots", "handofmidas", "goldenpowerglove", "xgloves", "powerglove", "poker", "starkillers", "xpants", "xarmor", "xhelmet", "fury", "partyhat"]); // Things that I probably won't find

        // We bought things from Ponty, wait a long time before trying to buy again.
        setTimeout(() => { this.pontyLoop() }, 15000);
    }

    private didBankStuff = false;
    private bankStuff(): void {
        if (parent.character.map !== "bank") {
            this.didBankStuff = false;
            return;
        } else if (this.didBankStuff) {
            // Withdraw items
            return;
        }
        let itemsToKeep: ItemName[] = ["tracker", "cscroll0", "cscroll1", "cscroll2", "scroll0", "scroll1", "scroll2", "stand0", "dexscroll", "intscroll", "strscroll", "monstertoken"]

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
            if (itemsToKeep.includes(item[1].name)) return; // Don't add items we want to keep

            if (G.items[item[1].name].s) {
                // If the item is stackable, deposit it.
                bank_store(item[0])
                return;
            }

            // Add it to our list of items;
            // items.push([item[1].name, item[1].level, "items", item[0]]);

            // Store all items for now
            bank_store(item[0])
        });

        // Add items from bank
        getInventory(parent.character.bank.items0).forEach((item) => {
            if (itemsToKeep.includes(item[1].name)) return; // Don't add items we want to keep
            if (G.items[item[1].name].s) return; // Don't add stackable items
            if (G.items[item[1].name].upgrade && item[1].level >= 8) return; // Don't withdraw high level items
            if (G.items[item[1].name].compound && item[1].level >= 4) return; // Don't withdraw high level items
            items.push([item[1].name, item[1].level, "items0", item[0]])
        });
        getInventory(parent.character.bank.items1).forEach((item) => {
            if (itemsToKeep.includes(item[1].name)) return; // Don't add items we want to keep
            if (G.items[item[1].name].s) return; // Don't add stackable items
            if (G.items[item[1].name].upgrade && item[1].level >= 8) return; // Don't withdraw high level items
            if (G.items[item[1].name].compound && item[1].level >= 4) return; // Don't withdraw high level items
            items.push([item[1].name, item[1].level, "items1", item[0]])
        });
        getInventory(parent.character.bank.items2).forEach((item) => {
            if (itemsToKeep.includes(item[1].name)) return; // Don't add items we want to keep
            if (G.items[item[1].name].s) return; // Don't add stackable items
            if (G.items[item[1].name].upgrade && item[1].level >= 8) return; // Don't withdraw high level items
            if (G.items[item[1].name].compound && item[1].level >= 4) return; // Don't withdraw high level items
            items.push([item[1].name, item[1].level, "items2", item[0]])
        });
        getInventory(parent.character.bank.items3).forEach((item) => {
            if (itemsToKeep.includes(item[1].name)) return; // Don't add items we want to keep
            if (G.items[item[1].name].s) return; // Don't add stackable items
            if (G.items[item[1].name].upgrade && item[1].level >= 8) return; // Don't withdraw high level items
            if (G.items[item[1].name].compound && item[1].level >= 4) return; // Don't withdraw high level items
            items.push([item[1].name, item[1].level, "items3", item[0]])
        });
        getInventory(parent.character.bank.items4).forEach((item) => {
            if (itemsToKeep.includes(item[1].name)) return; // Don't add items we want to keep
            if (G.items[item[1].name].s) return; // Don't add stackable items
            if (G.items[item[1].name].upgrade && item[1].level >= 8) return; // Don't withdraw high level items
            if (G.items[item[1].name].compound && item[1].level >= 4) return; // Don't withdraw high level items
            items.push([item[1].name, item[1].level, "items4", item[0]])
        });

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

        this.didBankStuff = true;
    }

    private luckedCharacters: any = {}
    private luckLoop(): void {
        if (parent.character.mp < 10) {
            // Do nothing
        } else if (!parent.character.s || !parent.character.s["mluck"] || parent.character.s["mluck"].ms < 10000 || parent.character.s["mluck"].f != parent.character.name) {
            // Luck ourself
            use_skill("mluck", character);
        } else {
            // Luck others
            for (let id in parent.entities) {
                let luckTarget = parent.entities[id];
                if (!luckTarget.player || luckTarget.npc) continue; // not a player
                if (distance(character, luckTarget) > 250) continue; // out of range
                if (this.luckedCharacters[luckTarget.name] && this.luckedCharacters[luckTarget.name] > Date.now() - parent.character.ping) continue; // Prevent spamming luck
                if (!luckTarget.s || !luckTarget.s["mluck"] || luckTarget.s["mluck"].ms < 3540000 /* 59 minutes */ || luckTarget.s["mluck"].f != parent.character.name) {
                    this.luckedCharacters[luckTarget.name] = Date.now();
                    use_skill("mluck", luckTarget);
                    game_log("lucking " + luckTarget.name)
                    break;
                }
            }
        }

        setTimeout(() => { this.luckLoop() }, Math.max(100, parent.next_skill["mluck"] - Date.now()));
    }
}

export let merchant = new Merchant();