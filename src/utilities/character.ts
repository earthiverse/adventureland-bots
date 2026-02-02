import type { Character, EntityCharacter } from "alclient";

// TODO: Move to, and grab from config
const healStrangers: boolean = false;
const healIfHpRatioBelow: number = 0.8;

export function wantToHeal(
  character: Character,
  target: EntityCharacter,
  options: {
    healStrangers?: boolean;
    healIfHpRatioBelow?: number;
  } = {
    healStrangers,
    healIfHpRatioBelow,
  },
): boolean {
  if (options.healStrangers !== true) {
    let stranger = true;
    if (stranger && character.party === target.party) stranger = false; // Same party
    if (stranger && character.owner === target.owner) stranger = false; // Same Player
    if (stranger) return false;
  }

  if (target.hp >= target.max_hp * healIfHpRatioBelow) return false;

  return true;
}
