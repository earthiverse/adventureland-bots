import type { Character } from "alclient";

export const setup = (character: Character) => {
  const regenLoop = async () => {
    try {
      if (character.socket.disconnected) return;

      await character.regenMp().catch();
    } catch (e) {
      // console.error("regen error", e);
    } finally {
      setTimeout(regenLoop, Math.max(100, character.getTimeout("use_mp")));
    }
  };
  regenLoop();
};
