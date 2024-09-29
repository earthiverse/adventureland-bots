import type { Character } from "alclient";
import { logDebug } from "../../utilities/logging.js";
import { getBestTarget } from "../../utilities/monster.js";

export const setup = (character: Character, monster: string = "goo") => {
  const moveLoop = () => {
    try {
      if (character.socket.disconnected) return;

      const entity = getBestTarget(character, { monster: monster });
      if (!entity) return;

      // Move if far away
      if (character.getDistanceTo(entity) > character.range) {
        character.move((entity.x + character.x) / 2, (entity.y + character.y) / 2).catch(logDebug);
      }
    } catch (e) {
      logDebug(e as Error);
    } finally {
      setTimeout(moveLoop, 100);
    }
  };
  moveLoop();
};
