import type { Character } from "alclient";
import { getBestTarget } from "../../utilities/monster.js";

export const setup = (character: Character, monster: string = "goo") => {
  const moveLoop = async () => {
    try {
      if (character.socket.disconnected) return;

      const entity = getBestTarget(character, { monster: monster });
      if (!entity) return;

      // Move if far away
      if (character.getDistanceTo(entity) > character.range) {
        character.move((entity.x + character.x) / 2, (entity.y + character.y) / 2).catch();
      }
    } catch (e) {
      // console.error("movement error", e);
    } finally {
      setTimeout(moveLoop, 100);
    }
  };
  moveLoop();
};
