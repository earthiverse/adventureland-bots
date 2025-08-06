import type { MonsterKey } from "typed-adventureland";
import type { characters } from "./index.js";

type CharacterKey = keyof typeof characters;
type OneToThreeCharacters = (
  | [CharacterKey]
  | [CharacterKey, CharacterKey]
  | [CharacterKey, CharacterKey, CharacterKey]
)[];

export const defaultMonster = "goo" as const satisfies MonsterKey;

/** Monsters we want to be on the lookout for */
export const checkMonsters = ["goldenbat", "crabxx"] as const satisfies MonsterKey[];

export const strategies: {
  [T in typeof defaultMonster | (typeof checkMonsters)[number]]: {
    characters: OneToThreeCharacters;
  };
} = {
  crabxx: {
    characters: [
      ["earthiverse", "earthRan2", "earthRan3"], // Rangers can kite the crabxx in a circle
    ],
  },
  goldenbat: {
    characters: [
      ["earthMag", "earthMag2", "earthMag3"], // Mages can magiport so we can go to where the golden bat is fast
    ],
  },
  goo: {
    characters: [
      ["earthiverse", "earthRan2", "earthRan3"], // Rangers can multishot
    ],
  },
};

// TODO: Equipment choice for things that we can kill fast
// 1. Prioritize attack speed
// 2. Prioritize mana regen
// 3. If we can't kill the monster in one shot, start recalculating things with more damage
/** What monster we will farm if we have nothing else to do */
