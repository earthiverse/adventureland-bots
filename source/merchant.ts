import { Character } from './character'
import { MonsterName, ItemName } from './definitions/adventureland';
import { compoundItem, upgradeItem, upgradeIfMany } from './upgrade'
import { sellUnwantedItems, exchangeItems, buyFromPonty } from './trade';
import { getInventory, buyAndUpgrade } from './functions';

class Merchant extends Character {
    targetPriority = {}
    mainTarget: MonsterName = null;

    protected mainLoop(): void {
        try {
            // TODO: move this to a custom moveLoop.
            // Movement
            if (this.holdPosition) {
                // Don't move.
            } else if (!smart.moving) {
                // event monsters
                let event = false;
                for (let eventMonsterName in parent.S) {
                    let eventMonster: any = parent.S[eventMonsterName as MonsterName]
                    if (!eventMonster.live) continue; // Not live
                    if (eventMonster.hp / eventMonster.max_hp > 0.9) continue; // Nobody's attacking it

                    event = true;
                    if (parent.distance(parent.character, eventMonster) > 250) smart_move(eventMonster);
                }

                // full inventory
                let full = true;
                for (let i = 0; i < 42; i++) {
                    if (parent.character.items[i]) continue;
                    full = false;
                    break;
                }

                // travel back and forth between characters
                if (full) {
                    set_message("Full!")
                    game_log("moving to the bank")
                    smart_move("bank")
                } else if (event) {
                    set_message("Event!")
                    // We're dealing with an event, don't move to characters.
                } else if (parent.character.map == "bank" && this.didBankStuff) {
                    set_message("Vendoring!")
                    smart_move({ map: "main", "x": 60, "y": -325 })
                } else if (parent.character.map !== "main") {
                    set_message("Vendoring!")
                    smart_move({ map: "main", "x": 60, "y": -325 })
                }
            }

            sellUnwantedItems();
            exchangeItems();
            
            this.bankStuff();

            //// Wearables
            // Rings
            compoundItem("dexring", 3);
            compoundItem("intring", 3);
            compoundItem("strring", 3);

            // Amulets
            compoundItem("dexamulet", 3);
            compoundItem("intamulet", 3);
            compoundItem("stramulet", 3);

            // Earrings
            compoundItem("dexearring", 3);
            compoundItem("intearring", 3);
            compoundItem("strearring", 3);

            // Belts
            compoundItem("dexbelt", 3);
            compoundItem("intbelt", 3);
            compoundItem("strbelt", 3);

            // Offhands
            upgradeItem("quiver", 8);
            upgradeItem("t2quiver", 6);
            compoundItem("wbook0", 3);
            compoundItem("wbook1", 2);

            // Capes
            upgradeItem("cape", 6);

            // Orbs
            compoundItem("orbg", 3);
            compoundItem("jacko", 3);
            compoundItem("lantern", 3);

            //// Weapons
            upgradeItem("firestaff", 8);
            upgradeItem("fireblade", 8);
            upgradeItem("t2bow", 8);

            //// Miscellaneous
            compoundItem("lostearring", 2);

            // Merchant Set
            upgradeItem("mcgloves", 6);
            upgradeItem("mcpants", 6);
            upgradeItem("mcarmor", 6);
            upgradeItem("mcboots", 6);
            upgradeItem("mchat", 6);

            // Wanderer's set
            upgradeItem("wattire", 8)
            upgradeItem("wshoes", 8)
            upgradeItem("wgloves", 8)

            // buyAndUpgrade("pants")
            // buyAndUpgrade("gloves")
            // buyAndUpgrade("shoes")
            // buyAndUpgrade("helmet")

            // buyAndUpgrade("bow", 8, 5)
            upgradeIfMany(8);

            super.mainLoop();
        } catch (error) {
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 1000);
        }
    }

    public run(): void {
        super.run();
        this.luckLoop();
        // this.lootLoop();
        this.pontyLoop();
    }

    protected attackLoop(): void {
        // Nothing for now, merchants can't usually attack.
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
            "lostearring", "jacko", "cape", "bcape", "monstertoken", "t2bow", "cupid", "candycanesword", "bowofthedead", "gbow", "hbow", "t2quiver", "oozingterror", "talkingskull", "greenbomb", "gem0", "gem1", "candy0", "candy1", "xboots", "handofmidas", "goldenpowerglove", "xgloves", "powerglove", "poker", "starkillers", "xpants", "xarmor", "xhelmet", "fury", "partyhat"]); // Things that I probably won't find

        // We bought things from Ponty, wait a long time before trying to buy again.
        setTimeout(() => { this.pontyLoop() }, 15000);
    }

    private didBankStuff = false;
    private bankStuff(): void {
        if (parent.character.map !== "bank") {
            this.didBankStuff = false;
            return;
        } else if(this.didBankStuff) {
            // Withdraw items
            return;
        }
        let itemsToKeep: ItemName[] = ["tracker", "cscroll0", "cscroll1", "cscroll2", "scroll0", "scroll1", "scroll2", "stand0", "dexscroll", "intscroll", "strscroll"]

        // Store extra gold
        if (parent.character.gold > 25000000) {
            bank_deposit(parent.character.gold - 25000000)
        } else if(parent.character.gold < 25000000) {
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
            items.push([item[1].name, item[1].level, "items0", item[0]])
        });
        getInventory(parent.character.bank.items1).forEach((item) => {
            if (itemsToKeep.includes(item[1].name)) return; // Don't add items we want to keep
            if (G.items[item[1].name].s) return; // Don't add stackable items
            items.push([item[1].name, item[1].level, "items1", item[0]])
        });
        getInventory(parent.character.bank.items2).forEach((item) => {
            if (itemsToKeep.includes(item[1].name)) return; // Don't add items we want to keep
            if (G.items[item[1].name].s) return; // Don't add stackable items
            items.push([item[1].name, item[1].level, "items2", item[0]])
        });
        getInventory(parent.character.bank.items3).forEach((item) => {
            if (itemsToKeep.includes(item[1].name)) return; // Don't add items we want to keep
            if (G.items[item[1].name].s) return; // Don't add stackable items
            items.push([item[1].name, item[1].level, "items3", item[0]])
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

            if(G.items[itemI[0]].compound && indexes.length >= 3) {
                for(let l = 0; l < 3; l++) {
                    let k = indexes[l];
                    let level = items[k][1];
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