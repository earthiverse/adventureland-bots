import { Utilities, type Character, type Ranger } from "alclient";
import type { MonsterKey } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";
import { getBestTarget, getBestTargets, ignoreMonster, unignoreMonster } from "../../utilities/monster.js";

export type AttackOptions = {
  monsters?: MonsterKey[];
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
export const setup = (character: Character, options: AttackOptions = { monsters: ["goo"] }) => {
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
        monsters: options.monsters,
        withinRange: character.range,
      });
      if (!entity) return;

      switch (character.ctype) {
        case "ranger": {
          await rangerLogic(character as Ranger, options);
          break;
        }
        case "merchant": {
          // TODO: Merchant Logic
          await defaultLogic(character, options);
          break;
        }
        case "mage": {
          // TODO: Mage Logic
          await defaultLogic(character, options);
          break;
        }
        case "paladin": {
          // TODO: Paladin Logic
          await defaultLogic(character, options);
          break;
        }
        case "priest": {
          // TODO: Priest Logic
          await defaultLogic(character, options);
          break;
        }
        case "rogue": {
          // TODO: Rogue Logic
          await defaultLogic(character, options);
          break;
        }
        case "warrior": {
          // TODO: Warrior Logic
          await defaultLogic(character, options);
          break;
        }
        default: {
          await defaultLogic(character, options);
          break;
        }
      }
    } catch (e) {
      if (entity !== undefined) unignoreMonster(entity);
      if (e instanceof Error || typeof e === "string") logDebug(`attackLoop: ${e}`);
    } finally {
      // TODO: When skills get added, add timeouts for skills
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

const defaultLogic = async (character: Character, options: AttackOptions) => {
  if (!character.canUse("attack")) return; // Can't attack

  const entity = getBestTarget(character, {
    monsters: options.monsters,
    withinRange: character.range,
  });
  if (!entity) return; // No target

  // Ignore the monster if we're going to kill it
  const damageRange = Utilities.damageRange(character, entity, character.game.G);
  if (entity.hp <= damageRange.min) ignoreMonster(entity);

  return character.basicAttack(entity);
};

const rangerLogic = async (character: Ranger, options: AttackOptions) => {
  const entities = getBestTargets(character, {
    monsters: options.monsters,
    withinRange: character.range,
    numTargets: 5,
  });
  if (entities.length === 0) return; // No targets

  // 5shot
  if (entities.length >= 5 && character.canUse("5shot")) {
    for (let i = 0; i < 5; i++) {
      const entity = entities[i]!;

      // Ignore the monster if we're going to kill it
      const damageRange = Utilities.damageRange(character, entity, character.game.G, { skill: "5shot" });
      if (entity.hp <= damageRange.min) ignoreMonster(entity);
    }
    return character.fiveShot(entities[0]!, entities[1]!, entities[2]!, entities[3]!, entities[4]!);
  }

  // 3shot
  if (entities.length >= 3 && character.canUse("3shot")) {
    for (let i = 0; i < 3; i++) {
      const entity = entities[i]!;

      // Ignore the monster if we're going to kill it
      const damageRange = Utilities.damageRange(character, entity, character.game.G, { skill: "3shot" });
      if (entity.hp <= damageRange.min) ignoreMonster(entity);
    }
    return character.threeShot(entities[0]!, entities[1]!, entities[2]!);
  }

  // Normal attack
  const entity = entities[0]!;

  // Ignore the monster if we're going to kill it
  const damageRange = Utilities.damageRange(character, entity, character.game.G);
  if (entity.hp <= damageRange.min) ignoreMonster(entity);

  return character.basicAttack(entity);
};
