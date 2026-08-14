import { TTLCache } from "@isaacs/ttlcache";
import { Utilities, type Character, type EntityMonster } from "alclient";
import TinyQueue, { type Comparator } from "tinyqueue";
import type { MonsterKey, SkillKey } from "typed-adventureland";
import { logWarning } from "./logging.js";

export const IGNORED_MONSTERS = new TTLCache<string, EntityMonster>({
  max: 500,
  ttl: 2000,
});

export const DEFAULT_COMPARATOR: Comparator<EntityMonster> = (a, b) => {
  // Prioritize monsters that aren't ignored
  const aIgnored = IGNORED_MONSTERS.has(a.id);
  const bIgnored = IGNORED_MONSTERS.has(b.id);
  if (aIgnored && !bIgnored) return 1;
  if (bIgnored && !aIgnored) return -1;

  // Prioritize monsters with targets
  const aHasTarget = a.target !== undefined;
  const bHasTarget = b.target !== undefined;
  if (aHasTarget && !bHasTarget) return -1;
  if (bHasTarget && !aHasTarget) return 1;

  // Prioritize monsters with higher levels
  if (a.level !== b.level) return b.level - a.level;

  // Prioritize lower hp monsters
  return a.hp - b.hp;
};

export type BestTargetOptions = {
  /** Which attack skill is being used */
  attackSkill?: SkillKey;
  comparator?: Comparator<EntityMonster>;
  /** If set, don't consider courage when choosing targets */
  ignoreCourage?: true;
  /** Which monsters to attack */
  monsters?: MonsterKey[];
  /** Only target monsters within this range */
  withinRange?: number;
  /** Only target monsters we can move to in a straight line */
  canMoveTo?: true;
};

export const DEFAULT_BEST_TARGET_OPTIONS: BestTargetOptions = {
  attackSkill: "attack",
  comparator: DEFAULT_COMPARATOR,
  monsters: ["goo"],
};

export function getBestTarget(
  character: Character,
  options: BestTargetOptions = DEFAULT_BEST_TARGET_OPTIONS,
): EntityMonster | undefined {
  return getBestTargets(character, { ...options, numTargets: 1 })[0];
}

export type BestTargetsOptions = BestTargetOptions & {
  numTargets: number;
};

export const DEFAULT_BEST_TARGETS_OPTIONS: BestTargetsOptions = {
  ...DEFAULT_BEST_TARGET_OPTIONS,
  numTargets: 1,
};

export function getBestTargets(
  character: Character,
  options: BestTargetsOptions = DEFAULT_BEST_TARGETS_OPTIONS,
): EntityMonster[] {
  const bestEntities = new TinyQueue<EntityMonster>([], options.comparator ?? DEFAULT_COMPARATOR);
  const courage = calculateRemainingCourage(character);

  for (const [, monster] of character.monsters) {
    // Filter out unwanted monsters
    if (options.monsters !== undefined && !options.monsters.includes(monster.type)) continue; // Not the wanted monster
    if (options.withinRange !== undefined && character.getDistanceTo(monster) > options.withinRange) continue; // Too far away
    if (options.canMoveTo === true && !character.canMoveTo(monster)) continue; // Can't move to in a straight line

    const damageRange = Utilities.damageRange(character, monster, character.game.G, {
      skill: options.attackSkill ?? "attack",
    });

    if (
      options.ignoreCourage !== true &&
      monster.hp > damageRange.min && // Monster not guaranteed to die in one shot
      monster.target == undefined // Monster doesn't have a target
    ) {
      switch (monster.damageType) {
        case "magical":
          if (courage.mcourage <= 0) continue; // Not enough magical courage
          courage.mcourage--;
          break;
        case "physical":
          if (courage.courage <= 0) continue; // Not enough physical courage
          courage.courage--;
          break;
        case "pure":
          if (courage.pcourage <= 0) continue; // Not enough pure courage
          courage.pcourage--;
          break;
        case "heal":
        case "none":
        default:
          continue;
      }
    }

    // The monster is OK
    bestEntities.push(monster);
  }

  // Return an array of the monsters
  const entities: EntityMonster[] = [];
  while (bestEntities.length && entities.length < options.numTargets)
    entities.push(bestEntities.pop() as EntityMonster);
  return entities;
}

export function ignoreMonster(monster: EntityMonster) {
  IGNORED_MONSTERS.set(monster.id, monster);
}

export function unignoreMonster(monster: EntityMonster) {
  IGNORED_MONSTERS.delete(monster.id);
}

export function canGiveCredit(character: Character, monster: EntityMonster): boolean {
  if (monster.target === undefined) return true; // No target
  if (monster.target === character.id) return true; // Targeting us

  const monsterTarget = character.characters.get(monster.target);
  if (monsterTarget === undefined) return false; // Targeting someone far away
  if (monsterTarget.party === character.party) return true; // Targeting another party member

  return false;
}

/**
 * Calculates remaining courage for the character based on their targets.
 *
 * @param character
 * @returns
 */
export function calculateRemainingCourage(character: Character) {
  const courage = {
    courage: character.courage,
    mcourage: character.mcourage,
    pcourage: character.pcourage,
  };

  let numTargets = character.targets;
  for (const monster of character.monsters.values()) {
    if (monster.target !== character.id) continue; // Not targeting character
    switch (monster.damageType) {
      case "physical":
        courage.courage--;
        break;
      case "magical":
        courage.mcourage--;
        break;
      case "pure":
        courage.pcourage--;
        break;
      default:
      case "heal":
      case "none":
        logWarning(`Monster ${monster.id} has ${monster.damageType} damage type`);
        break;
    }
    numTargets--;
  }

  if (numTargets > 0) {
    courage.courage -= numTargets;
    courage.mcourage -= numTargets;
    courage.pcourage -= numTargets;
  }

  return courage;
}
