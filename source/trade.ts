import { ItemName } from "./definitions/adventureland";
import { findItems, findItemsWithLevel } from "./functions";
let defaultItemsToKeep: ItemName[] = ["tracker", // Tracker
    "mpot0", "mpot1", "hpot0", "hpot1", // Potions
    "jacko"] // Useful for avoiding monsters
let defaultItemsToSell: ItemName[] = ["hpamulet", "hpbelt", // HP stuff
    "vitring", "vitearring", // Vit stuff
    "slimestaff", "ringsj", "cclaw", "spear", "throwingstars", "gphelmet", "phelmet", "maceofthedead", // Common things
    "coat", "shoes", "pants", "gloves", "helmet", // Common clothing
    "coat1", "shoes1", "pants1", "gloves1", "helmet1", // Heavy set
    "wbreeches", "wcap" // Wanderer clothing
];

export function sellUnwantedItems(itemsToSell: ItemName[] = defaultItemsToSell) {
    let foundNPCBuyer = false;
    for (let npc of parent.npcs.filter(npc => G.npcs[npc.id].role == "merchant")) {
        if (distance(character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 350) {
            foundNPCBuyer = true;
            break;
        }
    }
    if (!foundNPCBuyer) return; // Can't sell things, nobody is near.

    for (let itemName of itemsToSell) {
        for (let [i, item] of findItems(itemName)) {
            if (item.q) {
                sell(i, item.q);
            } else {
                sell(i, 1);
            }
        }
    }
}

export function openMerchantStand() {
    // TODO: Check if it's already open?? (Is this necessary?)

    let stand = findItems("stand0")
    if (!stand) return; // No stand available.

    parent.open_merchant(stand[0][0])
}

export function closeMerchantStand() {
    // TODO: Check if it's already closed?? (is this necessary?)
        
    parent.close_merchant()
}

export function buyFromPonty(itemNames: ItemName[]) {
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

export function transferItemsToMerchant(merchantName: string, itemsToKeep: ItemName[] = defaultItemsToKeep) {
    let merchant = parent.entities[merchantName];
    if (!merchant) return; // No merchant nearby
    if (distance(character, merchant) > 250) return; // Merchant is too far away to trade

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

// TODO: Add check for shells
// TODO: Add check for earrings
export function exchangeItems(xynExchangeItems: ItemName[] = ["gem0", "gem1", "armorbox", "weaponbox", "candy0", "candy1", "candycane", "mistletoe", "ornament"]) {
    // Xyn (Most exchanges)
    let foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "exchange" && distance(character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 250) {
            foundUpgrade = true;
            break;
        }
    }
    if (foundUpgrade && !parent.character.q["exchange"]) {
        for (let itemName of xynExchangeItems) {
            let items = findItems(itemName)
            if (items.length > 0) {
                parent.socket.emit("exchange", {
                    item_num: items[0][0],
                    q: items[0][1].q
                });
                return;
            }
        }
    }

    // Pwincess
    foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "pwincess" && distance(character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 250) {
            foundUpgrade = true;
            break;
        }
    }
    if (foundUpgrade && !parent.character.q["exchange"]) {
        // TODO: Move this to a parameter
        // NOTE: We are only exchanging level 2 lost earrings, because we want agile quivers
        let items = findItemsWithLevel("lostearring", 2)
        if (items.length > 0) {
            parent.socket.emit("exchange", {
                item_num: items[0][0],
                q: items[0][1].q
            });
            return;
        }
    }
}

export function buyPots(hpPotName: ItemName, hpPotQuantity: number, mpPotName: ItemName, mpPotQuantity: number) {

}