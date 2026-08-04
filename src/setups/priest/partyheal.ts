import type { Character, Priest } from "alclient";
import { wantToHeal } from "../../utilities/character.js";
import { logDebug } from "../../utilities/logging.js";

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Priest, ActiveData>();

/**
 * Starts the party heal logic for the given character
 * @param character
 * @param monster
 */
export const setup = (character: Priest, friends: Character[] = []) => {
  // Cancel any existing party heal logic for this character
  if (active.has(character)) {
    const current = active.get(character)!;
    if (!current.cancelled) return;
    current.cancelled = true;
  }

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);

  const partyHealLoop = async () => {
    if (activeData.cancelled) return;

    try {
      if (character.socket.disconnected) return;
      if (character.rip) return;
      if (!character.canUse("partyheal")) return;
      if (typeof character.party !== "string") return; // No party

      for (const friend of friends) {
        if (friend.socket.disconnected) continue;
        if (friend.rip) continue;
        if (friend.party !== character.party) continue; // Different party
        if (!wantToHeal(character, friend, { healIfHpRatioBelow: 0.5, ignoreDistance: true })) continue;

        logDebug(`Partyhealing because ${friend.id} has ${friend.hp}/${friend.max_hp} hp`);
        await character.partyHeal();
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`partyHealLoop (${character.id}): ${e}`);
    } finally {
      setTimeout(() => void partyHealLoop(), Math.max(100, character.getTimeout("partyheal")));
    }
  };
  void partyHealLoop();
};

/**
 * Stops the party heal logic for the given character
 * @param character
 */
export const teardown = (character: Priest) => {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
};
