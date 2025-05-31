import type { Character } from "alclient";
import type { MonsterKey } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";
import { getBestTarget, ignoreMonster, unignoreMonster } from "../../utilities/monster.js";

const active = new Set<Character>();

/**
 * Starts the attack logic for the given character
 * @param character
 * @param monster
 */
export const setup = (character: Character, monster: MonsterKey = "goo") => {
  active.add(character);

  const attackLoop = async () => {
    if (!active.has(character)) return; // Stop

    let entity;

    try {
      if (character.socket.disconnected) return;

      const entity = getBestTarget(character, {
        monster: monster,
        withinRange: character.range,
      });
      if (!entity) return;

      // TODO: Better ignore logic
      if (entity.hp < character.attack / 2) ignoreMonster(entity);

      await character.basicAttack(entity);
    } catch (e) {
      if (entity !== undefined) unignoreMonster(entity);
      if (e instanceof Error || typeof e === "string") logDebug(e);
    } finally {
      setTimeout(() => void attackLoop(), Math.max(100, character.getTimeout("attack")));
    }
  };

  void attackLoop();
};

/**
 * Stops the attack loop for the given character
 * @param character
 */
export const teardown = (character: Character) => {
  active.delete(character);
};
