import type { Character } from "alclient";
import type { MonsterKey } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";
import { getBestTarget, ignoreMonster, unignoreMonster } from "../../utilities/monster.js";

export const setup = (character: Character, monster: MonsterKey = "goo") => {
  const attackLoop = async () => {
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
      logDebug(e as Error);
    } finally {
      setTimeout(() => void attackLoop(), Math.max(100, character.getTimeout("attack")));
    }
  };
  void attackLoop();
};
