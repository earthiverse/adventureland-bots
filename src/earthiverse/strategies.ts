import { type Character } from "alclient";
import type { MonsterKey, ServerKey } from "typed-adventureland";
import type { AttackOptions } from "../setups/attack/attack.js";
import type { characters } from "./index.js";

export type CharacterKey = keyof typeof characters;
type OneToThreeCharacters = [CharacterKey] | [CharacterKey, CharacterKey] | [CharacterKey, CharacterKey, CharacterKey];

export const defaultServer = "USIII" as const satisfies ServerKey;
export const defaultMonster = "goo" as const satisfies MonsterKey;

/** Monsters we want to be on the lookout for (NOTE: Should be sorted highest priority first) */
export const checkMonsters = ["goldenbat", "crabxx", "snowman"] as const satisfies MonsterKey[];

export type StrategyMonsterKey = typeof defaultMonster | (typeof checkMonsters)[number];
export type CharacterStrategy = {
  attack?: (character: Character, options?: AttackOptions) => void;
};
export type Strategy = {
  /** Characters to farm the montser with */
  characters: {
    [T in CharacterKey]?: CharacterStrategy;
  };
};

export const strategies: {
  [T in StrategyMonsterKey]: Strategy;
} = {
  crabxx: {
    // Rangers can kite the crabxx in a circle
    characters: {
      earthiverse: {},
      earthRan2: {},
      earthRan3: {},
    },
  },
  goldenbat: {
    // Mages can magiport so we can go to where the golden bat is fast
    characters: {
      earthMag: {},
      earthMag2: {},
      earthMag3: {},
    },
  },
  goo: {
    // Rangers can multishot
    characters: {
      earthiverse: {},
      earthRan2: {},
      earthRan3: {},
    },
  },
  snowman: {
    // Rangers can multishot snowman while farming arctic bees
    characters: {
      earthiverse: {},
      earthRan2: {},
      earthRan3: {},
    },
  },
};

export function getIdealCharacters(strategy: Strategy): OneToThreeCharacters {
  return Object.keys(strategy.characters) as OneToThreeCharacters;
}

// TODO: Equipment choice for things that we can kill fast
// 1. Prioritize attack speed
// 2. Prioritize mana regen
// 3. If we can't kill the monster in one shot, start recalculating things with more damage
