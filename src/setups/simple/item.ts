import type { Character } from "alclient";
import {
  getItemDescription,
  wantToDestroy,
  wantToList,
  wantToMail,
  wantToReplenish,
  wantToSell,
} from "../../utilities/items.js";
import { Level, log, logDebug } from "../../utilities/logging.js";

const CHECK_EVERY_MS = 1000;
const DESTROY_LOG_LEVEL = Level.Notice;
const SELL_LOG_LEVEL = Level.Notice;

export const setup = (character: Character) => {
  const itemLoop = async () => {
    try {
      if (character.socket.disconnected) return;

      for (let index = 0; index < character.items.length; index++) {
        const item = character.items[index];
        if (!item) continue;

        try {
          const numToReplenish = wantToReplenish(character, item);
          if (numToReplenish) {
            await character.buy(item.name, numToReplenish);
          }

          if (wantToDestroy(item)) {
            await character.destroy(index);
            log(`${character.id} destroyed ${getItemDescription(item)}`, DESTROY_LOG_LEVEL);
          }

          if (wantToList(item)) {
            // TODO: List
          }

          if (wantToMail(item)) {
            // TODO: Mail
          }

          if (wantToSell(item)) {
            await character.sell(index, item.q ?? 1);
            log(`${character.id} sold ${getItemDescription(item)} to NPC`, SELL_LOG_LEVEL);
          }
        } catch (e) {
          logDebug(e as Error);
        }
      }
    } catch (e) {
      logDebug(e as Error);
    } finally {
      setTimeout(() => void itemLoop(), CHECK_EVERY_MS);
    }
  };
  void itemLoop();
};
