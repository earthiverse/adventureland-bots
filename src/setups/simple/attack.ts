import type { Character } from "alclient";
import { getBestTarget, ignoreMonster, unignoreMonster } from "../../utilities/monster.js";

export const setup = (character: Character, monster: string = "goo") => {
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
      if (entity) unignoreMonster(entity);
      // console.error("attack error", e);
    } finally {
      setTimeout(attackLoop, Math.max(100, character.getTimeout("attack")));
    }
  };
  attackLoop();
};
