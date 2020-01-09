import { ItemName, NPCType } from "./definitions/adventureland";
import { findItems, findItem, getInventory, findItemsWithLevel } from "./functions";
import { MyItemInfo, ItemLevelInfo } from "./definitions/bots";

export function sellUnwantedItems(itemsToSell: ItemLevelInfo) {
    if (parent.character.map == "bank") return // We can't do things in the bank
    if (!findItems("computer").length) {
        let foundNPCBuyer = false;
        if (!G.maps[parent.character.map].npcs) return // No NPCs on this map
        for (let npc of G.maps[parent.character.map].npcs.filter(npc => G.npcs[npc.id].role == "merchant")) {
            if (distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundNPCBuyer = true;
                break;
            }
        }
        if (!foundNPCBuyer) return // Can't sell things, nobody is near.
    }

    let itemsToSell2 = Object.keys(itemsToSell)
    for (let item of getInventory()) {
        if (itemsToSell2.includes(item.name)) {
            if (item.level && item.level > itemsToSell[item.name]) continue // Too high of level

            item.q ? sell(item.index, item.q) : sell(item.index, 1)
        }
    }
}

export function openMerchantStand() {
    let stand = findItem("stand0")
    if (!stand) return; // No stand available.

    if (parent.character.standed === undefined) // Checks if the stand is closed
        parent.open_merchant(stand.index)
}

export function closeMerchantStand() {
    if (parent.character.standed !== undefined) // Checks if the stand is open
        parent.close_merchant()
}

export function buyFromPonty(itemNames: ItemName[]) {
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
    if (!foundPonty) return; // We're not near Ponty, so don't buy from him.

    // Set up the handler
    let items_bought = 0;
    parent.socket.once("secondhands", (data: any) => {
        for (let i = 0; i < data.length; i++) {
            if (itemNames.includes(data[i].name)) {
                parent.socket.emit("sbuy", { "rid": data[i].rid });
                items_bought++;
                if (items_bought >= 5) break; // Only buy a few items at a time to prevent maxing out server calls.
            }
        }
    })

    // Attempt to buy stuff
    parent.socket.emit("secondhands")
}

export function transferItemsToMerchant(merchantName: string, itemsToKeep: ItemName[]) {
    let merchant = parent.entities[merchantName]
    if (!merchant) return; // No merchant nearby
    if (distance(parent.character, merchant) > 250) return; // Merchant is too far away to trade

    for (let i = 0; i < parent.character.items.length; i++) {
        let item = parent.character.items[i]
        if (!item) continue // Empty slot
        if (itemsToKeep.includes(item.name)) continue // We want to keep this

        if (item.q) {
            send_item(merchantName, i, item.q)
        } else {
            send_item(merchantName, i, 1)
        }
    }
}

export function transferGoldToMerchant(merchantName: string, minimumGold: number = 0) {
    if (parent.character.gold <= minimumGold) return; // Not enough gold
    let merchant = parent.entities[merchantName];
    if (!merchant) return; // No merchant nearby
    if (distance(parent.character, merchant) > 250) return; // Merchant is too far away to trade

    send_gold(merchantName, parent.character.gold - minimumGold);
}

// TODO: Add an agrument for a list of items to dismantle
export function dismantleItems() {
    if (parent.character.map == "bank") return // We can't do things in the bank
    if (!findItems("computer").length) {
        let foundGuy = false;
        for (let npc of parent.npcs) {
            if (npc.id == "craftsman" && distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 250) {
                foundGuy = true;
                break;
            }
        }
        if (!foundGuy) return; // We're not near the dismantle guy
    }

    let fireBlades = findItemsWithLevel("fireblade", 0)
    if (parent.character.gold >= G.dismantle["fireblade"].cost) {
        for (let blade of fireBlades) {
            parent.socket.emit("dismantle", { num: blade.index })
        }
    }

    let fireStaffs = findItemsWithLevel("firestaff", 0)
    if (parent.character.gold >= G.dismantle["firestaff"].cost) {
        for (let staff of fireStaffs) {
            parent.socket.emit("dismantle", { num: staff.index })
        }
    }
}

export function exchangeItems() {
    if (parent.character.q.exchange) return // Already exchanging something
    if (parent.character.map == "bank") return // We can't do things in the bank

    let haveComputer = findItems("computer").length

    let nearbyNPCs: NPCType[] = []
    for (let npc of parent.npcs) {
        if (!npc.position) continue // NPC doesn't have a position

        if (distance(parent.character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 250)
            nearbyNPCs.push(npc.id)
    }
    if (!nearbyNPCs.length && !haveComputer) return;

    let exchangableItems: { [T in NPCType]?: MyItemInfo[] } = {}
    for (let item of getInventory()) {
        let gInfo = G.items[item.name]
        let amountNeeded = gInfo.e
        if (!amountNeeded || amountNeeded > item.q) continue // Not exchangable, or not enough

        let npc: NPCType
        if (gInfo.quest) {
            npc = G.quests[gInfo.quest].id
        } else if (gInfo.type == "box" || gInfo.type == "gem" || gInfo.type == "misc") {
            npc = "exchange"
        } else if (item.name == "lostearring" && item.level == 2) {
            // NOTE: We're only exchanging level 2 earrings, because we want agile quivers
            npc = "pwincess"
        } else {
            continue
        }

        // Add the item to our list of exchangable items
        if (!exchangableItems[npc]) exchangableItems[npc] = []
        exchangableItems[npc].push(item)
    }

    for (let npc in exchangableItems) {
        if (!nearbyNPCs.includes(npc as NPCType) && !haveComputer) continue // Not near
        // Exchange something!
        let item = exchangableItems[npc as NPCType][0]
        exchange(item.index)
        return // We can only exchange one item at a time
    }
}

export function buyPots() {
    if (parent.character.map == "bank") return // We can't do things in the bank
    if (!findItems("computer").length) {
        let foundNPC = false;
        if (!G.maps[parent.character.map].npcs) return
        for (let npc of G.maps[parent.character.map].npcs.filter(npc => npc.id == "fancypots")) {
            if (distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundNPC = true;
                break;
            }
        }
        if (!foundNPC) return // Can't buy things, nobody is near.
    }
    if (parent.character.gold < G.items["mpot1"].g) return // No money

    let numMP = findItems("mpot1").reduce((a, b) => a + b.q, 0)
    let numHP = findItems("hpot1").reduce((a, b) => a + b.q, 0)

    if (numMP < 9999) {
        buy_with_gold("mpot1", Math.min(9999 - numMP, parent.character.gold / G.items["mpot1"].g))
    } else if (numHP < 9999) {
        buy_with_gold("hpot1", Math.min(9999 - numHP, parent.character.gold / G.items["hpot1"].g))
    }
}

export function buyScrolls() {
    if (parent.character.map == "bank") return // We can't do things in the bank
    if (!findItems("computer").length) {
        let foundNPC = false;
        if (!G.maps[parent.character.map].npcs) return
        for (let npc of G.maps[parent.character.map].npcs.filter(npc => npc.id == "fancypots")) {
            if (distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundNPC = true;
                break;
            }
        }
        if (!foundNPC) return // Can't buy things, nobody is near.
    }
    if (parent.character.gold < G.items["mpot1"].g) return // No money
}