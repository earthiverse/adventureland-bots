import type { Character } from "alclient";
import type { ServerToClient_drop } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Character, ActiveData>();

// TODO: Add active characters, and check if they are the best looter

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

      await character.openChest(data.id);
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`dropHandler: ${e}`);
    }
  };
  character.socket.on("drop", dropHandler);

  // TODO: loot loop if there are errors looting
};

/**
 * Stops the loot logic for the given character
 * @param character
 */
export function teardown(character: Character) {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
}
