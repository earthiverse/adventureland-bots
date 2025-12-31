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
export const setup = (character: Character, monsters: MonsterKey[] = ["goo"]) => {
  // Cancel any existing move logic for this character
  if (monsters.length === 0) throw new Error("No monsters provided");
  if (active.has(character)) active.get(character)!.cancelled = true;

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);

  const moveLoop = async () => {
    if (activeData.cancelled) return;

    try {
      if (character.socket.disconnected) return;

      const entity = getBestTarget(character, { canMoveTo: true, monsters });
      if (!entity) {
        return await character.smartMove(monsters[0] as MonsterKey);
      }

      // Move if far away
      const distance = character.getDistanceTo(entity);
      if (distance > character.range) {
        const dx = entity.x - character.x;
        const dy = entity.y - character.y;

        const moveDistance = distance - character.range + 10;

        character
          .move(character.x + (dx / distance) * moveDistance, character.y + (dy / distance) * moveDistance)
          .catch(logDebug);
        character.move((entity.x + character.x) / 2, (entity.y + character.y) / 2).catch(logDebug);
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`moveLoop: ${e}`);
    } finally {
      setTimeout(() => void moveLoop(), 100);
    }
  };
  void moveLoop();
};

/**
 * Stops the move logic for the given character
 * @param character
 */
export const teardown = (character: Character) => {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
};
