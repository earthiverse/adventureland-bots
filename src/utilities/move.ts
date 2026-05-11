import type { Character, Location } from "alclient";
import { logDebug } from "./logging.js";

export async function moveUntilDestination(
  character: Character,
  destination: Location,
  options: { getWithin: number; numTries: number } = { getWithin: 400, numTries: 5 },
): Promise<boolean> {
  // TODO: Improve so if the destination moves we adjust

  for (let i = 0; i < options.numTries; i++) {
    if (character.getDistanceTo(destination) < options.getWithin) return true;
    try {
      await character.smartMove(destination.map, destination.x, destination.y);
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`moveUntilDestination (${character.id}): ${e}`);
    }
  }
  return false;
}
