import { EventBus, type Character } from "alclient";
import { logDebug } from "../../utilities/logging.js";

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Character, ActiveData>();

EventBus.on("received_stacked_damage", (character) => {
  if (!active.has(character)) return; // Not avoiding stacking for this character

  // Move character in a random direction
  logDebug(`Moving ${character.id} to avoid stacking damage`);
  const d = Math.min(25, character.range);
  const x = -d + Math.round(2 * d * Math.random());
  const y = -d + Math.round(2 * d * Math.random());
  character.move(character.x + x, character.y + y).catch((e) => logDebug(`received_stacked_damage: ${e}`));
});

/**
 * Starts the move logic for the given character
 * @param character
 * @param monster
 */
export const setup = (character: Character) => {
  // Cancel any existing move logic for this character
  if (active.has(character)) active.get(character)!.cancelled = true;

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);
};

/**
 * Stops the move logic for the given character
 * @param character
 */
export const teardown = (character: Character) => {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
};
