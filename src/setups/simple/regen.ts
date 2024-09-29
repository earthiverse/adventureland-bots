import type { Character } from "alclient";
import { logDebug } from "../../utilities/logging.js";

export const setup = (character: Character) => {
  const regenLoop = async () => {
    try {
      if (character.socket.disconnected) return;

      const mpRatio = character.mp / character.max_mp;
      const hpRatio = character.hp / character.max_hp;

      if (mpRatio < hpRatio) {
        await character.regenMp();
      } else {
        await character.regenHp();
      }
    } catch (e) {
      logDebug(e as Error);
    } finally {
      setTimeout(() => void regenLoop(), Math.max(100, character.getTimeout("use_mp")));
    }
  };
  void regenLoop();
};
