import { type Character } from "alclient";
import type { BankPackTypeItemsOnly, MapKey } from "typed-adventureland";
import config from "../../../config/config.js";
import { itemData } from "../../plugins/data_tracker.js";
import {
  getEmptyBankSlotsCount,
  getItemsToStoreInBank,
  wantToDestroy,
  wantToDismantle,
  wantToExchange,
  wantToHold,
  wantToList,
  wantToMail,
  wantToSell,
} from "../../utilities/items.js";
import { logDebug } from "../../utilities/logging.js";
import { moveUntilDestination } from "../../utilities/move.js";
import { BANK_BASEMENT_CENTER, BANK_CENTER, BANK_UNDERGROUND_CENTER } from "../../utilities/positions.js";
import { throttle } from "../../utilities/throttle.js";

const { useBasement, useUnderground } = config.banking;

const BANK_MAPS: Extract<MapKey, "bank" | "bank_b" | "bank_u">[] = ["bank"];
if (useBasement) BANK_MAPS.push("bank_b");
if (useUnderground) BANK_MAPS.push("bank_u");

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Character, ActiveData>();

type MerchantOptions = {
  /** List of characters that the Merchant will perform actions on */
  characters: Character[];
  /** If enabled, we will go transfer gold to/from these characters */
  enableGoldTransfer?: {
    /** How much gold each player should have */
    amountToHold: number;
    whenGoldIsOverAmount: number;
    whenGoldIsUnderAmount: number;
  };
  enableItemTransfer?: {
    whenNumEmptySlotsUnderAmount: number;
  };
};

/**
 * Starts the merchant logic for the given character
 * @param character
 */
export const setup = (character: Character, options: MerchantOptions) => {
  checkOptions(options);

  // Cancel any existing loot logic for this character
  if (active.has(character)) active.get(character)!.cancelled = true;

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);

  const moveLoop = async () => {
    if (activeData.cancelled) return;

    try {
      if (character.socket.disconnected) return;
      if (!character.canMove()) return;

      await doGoldAndItemTransfer(character, options);
      await doBanking(character, options);

      // TODO: Hold position
      await character.smartMove({ map: "main", in: "main", x: 0, y: -100 });
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`moveLoop (${character.id}): ${e}`);
    } finally {
      setTimeout(() => void moveLoop(), 100);
    }
  };
  void moveLoop();
};

/**
 * Stops the loot logic for the given character
 * @param character
 */
export function teardown(character: Character) {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
}

function checkOptions(options: MerchantOptions) {
  if (options.enableGoldTransfer !== undefined) {
    if (options.enableGoldTransfer.amountToHold <= 0) throw new Error("amountToHold must be greater than 0");

    if (options.enableGoldTransfer.whenGoldIsOverAmount <= options.enableGoldTransfer.amountToHold)
      throw new Error("whenGoldIsOverAmount must be greater than amountToHold");

    if (options.enableGoldTransfer.whenGoldIsUnderAmount >= options.enableGoldTransfer.amountToHold)
      throw new Error("whenGoldIsUnderAmount must be less than amountToHold");
  }
}

async function doBanking(character: Character, options: MerchantOptions) {
  if (!throttle(`banking_${character.id}`, 60_000)) return;

  try {
    const goldConfig = options.enableGoldTransfer;
    if (goldConfig) {
      const needsDeposit = character.gold > goldConfig.whenGoldIsOverAmount;
      const needsWithdraw = character.gold < goldConfig.whenGoldIsUnderAmount;

      if (needsDeposit || needsWithdraw) {
        if (!character.map.startsWith("bank")) await character.smartMove(BANK_CENTER.map, BANK_CENTER.x, BANK_CENTER.y);

        logDebug(`bank amount: ${character.bank!.gold}`);

        if (needsDeposit) {
          const amount = character.gold - goldConfig.amountToHold;
          logDebug(`${character.id} is depositing ${amount} gold in the bank`);
          await character.depositGold(amount);
        } else if ((character.bank?.gold ?? 0) > 0) {
          const amount = Math.min(character.bank!.gold, goldConfig.amountToHold - character.gold);
          logDebug(`${character.id} is withdrawing ${amount} gold from the bank`);
          await character.withdrawGold(amount);
        }
      }
    }
  } catch (e) {
    if (e instanceof Error || typeof e === "string") logDebug(`doBanking (gold) (${character.id}): ${e}`);
    if (e instanceof Error && e.stack !== undefined) logDebug(e.stack);
  }

  if (getEmptyBankSlotsCount() === 0) return; // Bank is full, we can't do anything

  for (const map of BANK_MAPS) {
    const numItemsToBank = getItemsToStoreInBank(character).length;
    if (numItemsToBank === 0) break; // Finished banking
    if (getEmptyBankSlotsCount(map) === 0) continue; // No slots on this map

    try {
      if (map === "bank") {
        // Move to bank
        await character.smartMove(BANK_CENTER.map, BANK_CENTER.x, BANK_CENTER.y);
      } else if (map === "bank_b") {
        await character.smartMove(BANK_BASEMENT_CENTER.map, BANK_BASEMENT_CENTER.x, BANK_BASEMENT_CENTER.y);
      } else if (map === "bank_u") {
        await character.smartMove(BANK_UNDERGROUND_CENTER.map, BANK_UNDERGROUND_CENTER.x, BANK_UNDERGROUND_CENTER.y);
      }

      // Deposit items
      for (const itemPos of getItemsToStoreInBank(character)) {
        if (getEmptyBankSlotsCount(map) === 0) break; // Bank is full, we can't do anything
        await character.depositItem(itemPos);
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`doBanking (items) (${character.id}): ${e}`);
    }
  }

  // TODO: Withdraw items
  for (const map of BANK_MAPS) {
    let packFrom: number;
    let packTo: number;
    if (map == "bank") {
      packFrom = 0;
      packTo = 7;
    } else if (map == "bank_b") {
      packFrom = 8;
      packTo = 23;
    } else if (map == "bank_u") {
      packFrom = 24;
      packTo = 47;
    }
    for (let packNum = packFrom!; packNum <= packTo!; packNum++) {
      const pack = `items${packNum}` as BankPackTypeItemsOnly;
      if (!itemData.has(pack)) continue; // No pack data

      // TODO: Check for items we want
      const packItems = itemData.get(pack)!;
      for (let packSlot = 0; packSlot < packItems.length; packSlot++) {
        const item = packItems[packSlot];
        if (!item) continue; // No item in slot
        if (
          wantToDestroy(character, item) ||
          wantToDismantle(item, character.esize, character.gold, character.game.G) ||
          wantToSell(item, character.game.G, "npc")
        ) {
          await character.withdrawItem(pack, packSlot);
          continue;
        }
        if (wantToExchange(item, character.esize, character.game.G)) {
          await character.withdrawItem(pack, packSlot);
          if (character.esize <= 1) break; // No more space
          continue;
        }
        const list = wantToList(item, character.game.G);
        if (list !== false) {
          await character.withdrawItem(pack, packSlot);
          // TODO: List item
          continue;
        }
        const recipient = wantToMail(item);
        if (recipient !== false) {
          await character.withdrawItem(pack, packSlot);
          // TODO: Mail item
          continue;
        }

        // TODO: Want to make shiny logic
        //       We need to check if we have materials

        // TODO: Want to upgrade logic
        //       We need to check if we have scrolls
      }
    }
  }
}

async function doGoldAndItemTransfer(character: Character, options: MerchantOptions) {
  for (const other of options.characters) {
    if (other.id === character.id) continue; // Skip ourself

    // Transfer gold
    if (
      options.enableGoldTransfer &&
      options.enableGoldTransfer.whenGoldIsOverAmount !== undefined &&
      other.gold >= options.enableGoldTransfer.whenGoldIsOverAmount
    ) {
      logDebug(`${character.id} is moving to ${other.id} to take gold`);
      await character.smartMove(other); // TODO: Get within
      const amount = other.gold - options.enableGoldTransfer.amountToHold;
      if (amount > 0) await other.sendGold(character.id, amount);
    } else if (
      options.enableGoldTransfer &&
      options.enableGoldTransfer.whenGoldIsUnderAmount !== undefined &&
      other.gold <= options.enableGoldTransfer.whenGoldIsUnderAmount && // They don't have enough gold
      character.gold >= options.enableGoldTransfer.amountToHold // We have enough gold
    ) {
      if (await moveUntilDestination(character, other)) {
        logDebug(`${character.id} is moving to ${other.id} to give gold`);
        const amount = Math.min(
          character.gold - options.enableGoldTransfer.amountToHold, // How much extra gold we have
          options.enableGoldTransfer.amountToHold - other.gold, // How much gold they need
        );
        if (amount > 0) await character.sendGold(other.id, amount);
      }
    }

    // Transfer items
    if (
      options.enableItemTransfer &&
      options.enableItemTransfer.whenNumEmptySlotsUnderAmount > other.esize && // They don't have very many empty inventory slots
      character.esize > 1 // We have space
    ) {
      logDebug(`${character.id} is moving to ${other.id} to take items`);
      if (await moveUntilDestination(character, other)) {
        for (let i = 0; i < other.items.length; i++) {
          const item = other.items[i];
          if (!item) continue; // No item
          if (wantToHold(other, item)) continue;
          if (character.esize <= 1) break; // We have no more space
          await other.sendItem(character.id, i, item.q ?? 1);
        }
      }
    }
  }
}
