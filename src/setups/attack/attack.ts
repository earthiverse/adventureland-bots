import { type Character } from "alclient";
import type { MonsterKey } from "typed-adventureland";
import { defaultMonster } from "../../earthiverse/strategies.js";
import { logDebug } from "../../utilities/logging.js";
import { getBestTarget, ignoreMonster, unignoreMonster } from "../../utilities/monster.js";

export type AttackOptions = {
  monster?: MonsterKey;
};

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Character, ActiveData>();

/**
 * Starts the attack logic for the given character
 * @param character
 * @param monster
 */
export const setup = (character: Character, options: AttackOptions = { monster: defaultMonster }) => {
  // Cancel any existing attack logic for this character
  if (active.has(character)) active.get(character)!.cancelled = true;

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);

  const attackLoop = async () => {
    if (activeData.cancelled) return;

    let entity;

    try {
      if (character.socket.disconnected) return;

      const entity = getBestTarget(character, {
        monster: options.monster,
        withinRange: character.range,
      });
      if (!entity) return;

      // TODO: Better ignore logic
      if (entity.hp < character.attack / 2) ignoreMonster(entity);

      // TODO: Better attack logic
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
 * Stops the attack logic for the given character
 * @param character
 */
export const teardown = (character: Character) => {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
};
