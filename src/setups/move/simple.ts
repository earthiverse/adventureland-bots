import type { Character } from "alclient";
import type { MonsterKey } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";
import { getBestTarget } from "../../utilities/monster.js";

const active = new Set<Character>();

/**
 * Starts the move logic for the given character
 * @param character
 * @param monster
 */
export const setup = (character: Character, monster: MonsterKey = "goo") => {
  active.add(character);

  const moveLoop = () => {
    if (!active.has(character)) return; // Stop
    try {
      if (character.socket.disconnected) return;

      const entity = getBestTarget(character, { monster: monster });
      if (!entity) return;

      // Move if far away
      if (character.getDistanceTo(entity) > character.range) {
        character.move((entity.x + character.x) / 2, (entity.y + character.y) / 2).catch(logDebug);
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(e);
    } finally {
      setTimeout(moveLoop, 100);
    }
  };
  moveLoop();
};

/**
 * Stops the move logic for the given character
 * @param character
 */
export const teardown = (character: Character) => {
  active.delete(character);
};
