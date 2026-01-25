import type { Character } from "alclient";
import type { MonsterKey } from "typed-adventureland";
import { setup as attackSetup } from "./attack/attack.js";
import { setup as itemSetup } from "./item/config.js";
import { setup as lootSetup } from "./loot/simple.js";
import { setup as moveSetup } from "./move/simple.js";
import { setup as regenSetup } from "./regen/simple.js";

export const setup = (character: Character, monsters: MonsterKey[] = ["goo"]) => {
  attackSetup(character, { monsters });
  itemSetup(character);
  lootSetup(character);
  moveSetup(character, monsters);
  regenSetup(character);
};
