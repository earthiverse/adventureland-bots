import type { Character, EntityMonster } from "alclient";
import type { Comparator } from "tinyqueue";
import { logDebug } from "../../utilities/logging.js";
import { DEFAULT_COMPARATOR, getBestTarget } from "../../utilities/monster.js";

function getComparator(character: Character): Comparator<EntityMonster> {
  return (a, b) => {
    const score = DEFAULT_COMPARATOR(a, b);
    if (score !== 0) return score;

    // TODO: Improve by walking away from other bots

    // Prioritize closer monsters
    const aDistance = character.getDistanceTo(a);
    const bDistance = character.getDistanceTo(b);
    return aDistance - bDistance;
  };
}

export const setup = (character: Character, monster: string = "goo") => {
  const comparator = getComparator(character);
  const moveLoop = () => {
    try {
      if (character.socket.disconnected) return;

      const entity = getBestTarget(character, { comparator, monster });
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
