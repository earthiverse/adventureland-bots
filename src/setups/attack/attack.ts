import { Utilities, type Character, type Priest, type Ranger, type Rogue } from "alclient";
import type { MonsterKey } from "typed-adventureland";
import { wantToHeal } from "../../utilities/character.js";
import { logDebug } from "../../utilities/logging.js";
import { getBestTarget, getBestTargets, ignoreMonster, unignoreMonster } from "../../utilities/monster.js";

export type AttackOptions = {
  monsters?: MonsterKey[];
};

export type PriestAttackOptions = {
  healStrangers?: true;
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

    try {
      if (character.socket.disconnected) return;

      switch (character.ctype) {
        case "ranger": {
          await rangerAttackLogic(character as Ranger, options);
          break;
        }
        case "merchant": {
          // TODO: Merchant Logic
          await defaultAttackLogic(character, options);
          break;
        }
        case "mage": {
          // TODO: Mage Logic
          await defaultAttackLogic(character, options);
          break;
        }
        case "paladin": {
          // TODO: Paladin Logic
          await defaultAttackLogic(character, options);
          break;
        }
        case "priest": {
          // TODO: Priest Logic
          await defaultAttackLogic(character, options);
          break;
        }
        case "rogue": {
          await rogueAttackLogic(character as Rogue, options);
          break;
        }
        case "warrior": {
          // TODO: Warrior Logic
          await defaultAttackLogic(character, options);
          break;
        }
        default: {
          await defaultAttackLogic(character, options);
          break;
        }
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`attackLoop: ${e}`);
    } finally {
      // TODO: When skills get added, add timeouts for skills
      const timeoutMs = Math.max(
        100, // TODO: Config
        Math.min(
          character.getTimeout("attack"),
          ...(character.ctype === "rogue" ? [character.getTimeout("quickpunch")] : []),
        ),
      );

      setTimeout(() => void attackLoop(), timeoutMs);
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

const defaultAttackLogic = async (character: Character, options: AttackOptions) => {
  if (!character.canUse("attack")) return; // Can't attack

  const entity = getBestTarget(character, {
    monsters: options.monsters,
    withinRange: character.range,
  });
  if (!entity) return; // No target

  // Ignore the monster if we're going to kill it
  const damageRange = Utilities.damageRange(character, entity, character.game.G);
  if (entity.hp <= damageRange.min) ignoreMonster(entity);

  return character.basicAttack(entity).catch((e) => {
    unignoreMonster(entity);
    if (e instanceof Error || typeof e === "string") logDebug(`basicAttack: ${e}`);
  });
};

const priestAttackLogic = async (character: Priest, options: PriestAttackOptions) => {
  // Look for other characters to heal
  for (const other of character.characters.values()) {
    if (!wantToHeal(character, other)) continue;
  }
};

const rangerAttackLogic = async (character: Ranger, options: AttackOptions) => {
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
    return character.fiveShot(entities[0]!, entities[1]!, entities[2]!, entities[3]!, entities[4]!).catch((e) => {
      unignoreMonster(entities[0]!);
      unignoreMonster(entities[1]!);
      unignoreMonster(entities[2]!);
      unignoreMonster(entities[3]!);
      unignoreMonster(entities[4]!);
      if (e instanceof Error || typeof e === "string") logDebug(`fiveShot: ${e}`);
    });
  }

  // 3shot
  if (entities.length >= 3 && character.canUse("3shot")) {
    for (let i = 0; i < 3; i++) {
      const entity = entities[i]!;

      // Ignore the monster if we're going to kill it
      const damageRange = Utilities.damageRange(character, entity, character.game.G, { skill: "3shot" });
      if (entity.hp <= damageRange.min) ignoreMonster(entity);
    }
    return character.threeShot(entities[0]!, entities[1]!, entities[2]!).catch((e) => {
      unignoreMonster(entities[0]!);
      unignoreMonster(entities[1]!);
      unignoreMonster(entities[2]!);
      if (e instanceof Error || typeof e === "string") logDebug(`threeShot: ${e}`);
    });
  }

  if (!character.canUse("attack")) return; // Can't attack

  // Normal attack
  const entity = entities[0]!;

  // Ignore the monster if we're going to kill it
  const damageRange = Utilities.damageRange(character, entity, character.game.G);
  if (entity.hp <= damageRange.min) ignoreMonster(entity);

  return character.basicAttack(entity);
};

const rogueAttackLogic = async (character: Rogue, options: AttackOptions) => {
  const entity = getBestTarget(character, {
    monsters: options.monsters,
    withinRange: character.range,
  });
  if (!entity) return; // No target

  if (character.canUse("quickpunch")) {
    // Ignore the monster if we're going to kill it
    const damageRange = Utilities.damageRange(character, entity, character.game.G, { skill: "quickpunch" });
    if (entity.hp <= damageRange.min) ignoreMonster(entity);

    character.quickPunch(entity).catch((e) => {
      unignoreMonster(entity);
      if (e instanceof Error || typeof e === "string") logDebug(`quickPunch: ${e}`);
    });
  } else if (character.canUse("quickstab")) {
    // Ignore the monster if we're going to kill it
    const damageRange = Utilities.damageRange(character, entity, character.game.G, { skill: "quickstab" });
    if (entity.hp <= damageRange.min) ignoreMonster(entity);

    character.quickStab(entity).catch((e) => {
      unignoreMonster(entity);
      if (e instanceof Error || typeof e === "string") logDebug(`quickStab: ${e}`);
    });
  }

  // Use the basic attack
  return defaultAttackLogic(character, options);
};
