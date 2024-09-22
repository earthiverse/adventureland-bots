import TTLCache from "@isaacs/ttlcache";
import type { Character, EntityMonster } from "alclient";

export const ignore = new TTLCache<string, EntityMonster>({
  max: 100,
  ttl: 2000,
});

export const setup = (character: Character, monster: string = "goo") => {
  const attackLoop = async () => {
    let entity;
    try {
      if (character.socket.disconnected) return;

      entity = [...character.monsters.values()].filter((m) => {
        if (m.type !== monster) return false; // Different type than what we want
        if (ignore.has(m.id)) return false; // Will die soon
        if (character.getDistanceTo(m) > character.range) return false;
        return true;
      })[0];
      if (!entity) return;

      if (entity.hp < character.attack / 2) ignore.set(entity.id, entity);

      // console.log("attacking", entity.id);
      await character.basicAttack(entity);
    } catch (e) {
      if (entity) ignore.delete(entity.id);
      // console.error("attack error", e);
    } finally {
      setTimeout(attackLoop, Math.max(100, character.getTimeout("attack")));
    }
  };
  attackLoop();
};
