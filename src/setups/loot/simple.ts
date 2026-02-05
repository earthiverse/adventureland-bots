import { TTLCache } from "@isaacs/ttlcache";
import type { Character } from "alclient";
import type { ServerToClient_drop } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Character, ActiveData>();

const recentlyLooted = new TTLCache<string, ServerToClient_drop>({ ttl: 1000 });

/**
 * Starts the loot logic for the given character
 * @param character
 */
export const setup = (character: Character) => {
  if (active.has(character)) active.get(character)!.cancelled = true;

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);

  const dropHandler = async (data: ServerToClient_drop) => {
    try {
      if (activeData.cancelled) character.socket.off("drop", dropHandler);
      if (recentlyLooted.has(data.id)) return; // Already looted
      if (!isBestLooter(character, data)) return; // Not the best looter

      recentlyLooted.set(data.id, data);
      await character.openChest(data.id);
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`dropHandler: ${e}`);
    }
  };
  character.socket.on("drop", dropHandler);

  const lootLoop = async () => {
    if (activeData.cancelled) return;

    try {
      if (character.socket.disconnected) return;
      if (character.rip) return;

      for (const chest of character.chests.values()) {
        if (recentlyLooted.has(chest.id)) continue; // Already looted
        if (!isBestLooter(character, chest)) continue; // Not the best

        recentlyLooted.set(chest.id, chest);
        await character.openChest(chest.id);
        break; // Only loot one chest per loop
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`lootLoop: ${e}`);
    } finally {
      setTimeout(() => void lootLoop(), 100);
    }
  };
  void lootLoop();
};

/**
 * Stops the loot logic for the given character
 * @param character
 */
export function teardown(character: Character) {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
}

function isBestLooter(character: Character, chest: ServerToClient_drop) {
  let bestGoldM = Number.NEGATIVE_INFINITY;
  let bestLooters: Character[] = [];

  for (const looter of active.keys()) {
    const distanceToChest = character.getDistanceTo({ map: chest.map, in: character.in, x: chest.x, y: chest.y });
    const goldM = distanceToChest > 400 ? 1 : looter.goldm;

    if (goldM > bestGoldM) {
      bestGoldM = goldM;
      bestLooters = [looter];
    } else if (goldM === bestGoldM) {
      bestLooters.push(looter);
    }
  }

  return bestLooters.includes(character);
}
