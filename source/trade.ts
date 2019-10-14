import { ItemName } from "./definitions/adventureland";
import { findItems } from "./functions";
let defaultItemsToGiveToMerchant: ItemName[] = ["monstertoken",
    "gem0", "gem1", "lostearring",
    "coat1", "shoes1", "pants1", "gloves1", "helmet1",
    "dexamulet", "intamulet", "stramulet",
    "strring", "intring", "dexring",
    "dexbelt", "strbelt", "intbelt",
    "cape",
    "wbook0", "quiver",
    "orbg",
    "whiteegg", "beewings", "rattail", "spores",
    "candycane", "candy0", "candy1"
];
let defaultItemsToSell: ItemName[] = ["hpamulet", "hpbelt",
    "vitring", "vitearring",
    "slimestaff",
    "cclaw", "spear", "throwingstars",
    "ringsj",
    "shoes", "helmet", "coat", "gloves", "pants",
    "wattire", "wshoes", "wbreeches", "wgloves", "wcap"
];

export function sellUnwantedItems(itemsToSell: ItemName[] = defaultItemsToSell) {
    let foundFancypots = false;
    for (let npc of parent.npcs) {
        if (["fancypots"].includes(npc.id) && distance(character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 250) {
            foundFancypots = true;
            break;
        }
    }
    if (!foundFancypots) return; // Can't sell things, nobody is near.

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

export function transferItemsToMerchant(merchantName: string, itemsToTransfer: ItemName[] = defaultItemsToGiveToMerchant, itemsToSell: ItemName[] = defaultItemsToSell) {
    let merchant = parent.entities[merchantName];
    if (!merchant) return; // No merchant nearby
    if (distance(character, merchant) > 250) return; // Merchant is too far away to trade

    for (let itemName of itemsToTransfer) {
        let items = findItems(itemName);
        for (let [i, item] of items) {
            if (item.q) {
                send_item(merchantName, i, item.q)
            } else {
                send_item(merchantName, i, 1)
            }
        }
    }

    for (let itemName of itemsToSell) {
        let items = findItems(itemName);
        for (let [i, item] of items) {
            if (item.q) {
                send_item(merchantName, i, item.q)
            } else {
                send_item(merchantName, i, 1)
            }
        }
    }
}

export function transferGoldToMerchant(merchantName: string, minimumGold: number = 0) {
    if (character.gold <= minimumGold) return; // Not enough gold
    let merchant = parent.entities[merchantName];
    if (!merchant) return; // No merchant nearby
    if (distance(character, merchant) > 250) return; // Merchant is too far away to trade

    send_gold(merchantName, character.gold - minimumGold);
}