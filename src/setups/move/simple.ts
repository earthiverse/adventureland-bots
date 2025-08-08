import type { Character } from "alclient";
import type { MonsterKey } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";
import { getBestTarget } from "../../utilities/monster.js";

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Character, ActiveData>();

/**
 * Starts the move logic for the given character
 * @param character
 * @param monster
 */
export const setup = (character: Character, monster: MonsterKey = "goo") => {
  // Cancel any existing move logic for this character
  if (active.has(character)) active.get(character)!.cancelled = true;

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);

  const moveLoop = () => {
    if (activeData.cancelled) return;

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
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
};
