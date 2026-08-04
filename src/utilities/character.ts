import type { Character, EntityCharacter } from "alclient";

// TODO: Move to, and grab from config
const healStrangers: boolean = false;
const healIfHpRatioBelow: number = 0.8;

export function wantToHeal(
  character: Character,
  target: EntityCharacter | Character,
  options: {
    healStrangers?: boolean;
    healIfHpRatioBelow?: number;
    ignoreDistance?: boolean;
  } = {},
): boolean {
  if (target.rip) return false; // Target is already dead

  if ((options.healStrangers ?? healStrangers) !== true) {
    let stranger = true;
    if (
      character.party === target.party || // Same party
      character.owner === target.owner // Same Player
    )
      stranger = false;
    if (stranger) return false;
  }

  if (options.ignoreDistance !== true && character.getDistanceTo(target) > character.range) return false;

  if (target.hp >= target.max_hp * (options.healIfHpRatioBelow ?? healIfHpRatioBelow)) return false;

  return true;
}
