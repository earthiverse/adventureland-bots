import type { Character } from "alclient";
import { ignore } from "./attack.js";

export const setup = (character: Character, monster: string = "goo") => {
  const moveLoop = async () => {
    try {
      if (character.socket.disconnected) return;

      const closestEntity = [...character.monsters.values()]
        .filter((m) => m.type === monster && !ignore.has(m.id))
        .reduce((a, b) =>
          character.getDistanceTo(a) <= character.getDistanceTo(b) ? a : b
        );

      if (character.getDistanceTo(closestEntity) > character.range) {
        character.move(closestEntity.x, closestEntity.y).catch();
      }
    } catch (e) {
      // console.error("movement error", e);
    } finally {
      setTimeout(moveLoop, 100);
    }
  };
  moveLoop();
};
