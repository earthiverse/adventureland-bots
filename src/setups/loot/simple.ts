import type { Character } from "alclient";
import type { ServerToClient_drop } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";

const active = new Map<Character, (data: ServerToClient_drop) => Promise<void>>();

/**
 * Starts the loot logic for the given character
 * @param character
 */
export const setup = (character: Character) => {
  const dropHandler = async (data: ServerToClient_drop) => {
    try {
      await character.openChest(data.id);
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(e);
    }
  };

  active.set(character, dropHandler);
  character.socket.on("drop", dropHandler);

  // TODO: loot loop if there are errors looting
};

/**
 * Stops the loot logic for the given character
 * @param character
 */
export function teardown(character: Character) {
  const dropHandler = active.get(character);
  if (dropHandler) character.socket.off("drop", dropHandler);
  active.delete(character);
}
