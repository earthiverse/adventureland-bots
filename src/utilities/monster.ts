import TTLCache from "@isaacs/ttlcache";
import type { Character, EntityMonster } from "alclient";
import TinyQueue, { type Comparator } from "tinyqueue";
import type { MonsterKey } from "typed-adventureland";

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

  // Prioritize monsters with higher levels
  if (a.level !== b.level) return b.level - a.level;

  // Prioritize lower hp monsters
  return a.hp - b.hp;
};

export type BestTargetOptions = {
  comparator?: Comparator<EntityMonster>;
  /** Which monster to attack */
  monster?: MonsterKey;
  /** Only target monsters within this range */
  withinRange?: number;
};

export const DEFAULT_BEST_TARGET_OPTIONS: BestTargetOptions = {
  comparator: DEFAULT_COMPARATOR,
  monster: "goo",
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

  for (const [, monster] of character.monsters) {
    // Filter out unwanted monsters
    if (options.monster !== undefined && monster.type !== options.monster) continue; // Not the wanted monster
    if (options.withinRange !== undefined && character.getDistanceTo(monster) > options.withinRange) continue; // Too far away

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
