import type { Character } from "alclient";
import { setup as attackSetup } from "./attack.js";
import { setup as itemSetup } from "./item.js";
import { setup as lootSetup } from "./loot.js";
import { setup as moveSetup } from "./move.js";
import { setup as regenSetup } from "./regen.js";

export const setup = (character: Character, monster: string = "goo") => {
  attackSetup(character, monster);
  itemSetup(character);
  lootSetup(character);
  moveSetup(character, monster);
  regenSetup(character);
};
