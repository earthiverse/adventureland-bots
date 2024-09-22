import type { Character } from "alclient";

export const setup = (character: Character) => {
  character.socket.on("drop", async (data) => {
    try {
      await character.openChest(data.id);
    } catch (e) {
      console.error("loot error", e);
    }
  });
};
