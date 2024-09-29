import type { Character } from "alclient";
import { logDebug } from "../../utilities/logging.js";

export const setup = (character: Character) => {
  character.socket.on("drop", async (data) => {
    try {
      await character.openChest(data.id);
    } catch (e) {
      logDebug(e as Error);
    }
  });

  // TODO: loot loop if there are errors looting
};
