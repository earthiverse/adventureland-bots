import type { Character, EntityMonster } from "alclient";
import type { Comparator } from "tinyqueue";
import type { MonsterKey } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";
import { getBestTarget, IGNORED_MONSTERS } from "../../utilities/monster.js";

const active = new Set<Character>();

function getComparator(character: Character): Comparator<EntityMonster> {
  return (a, b) => {
    // Prioritize monsters that aren't ignored
    const aIgnored = IGNORED_MONSTERS.has(a.id);
    const bIgnored = IGNORED_MONSTERS.has(b.id);
    if (aIgnored && !bIgnored) return 1;
    if (bIgnored && !aIgnored) return -1;

    // Prioritize monsters that are targeting us
    const aTargetingUs = a.target === character.id;
    const bTargetingUs = b.target === character.id;
    if (aTargetingUs && !bTargetingUs) return -1;
    if (bTargetingUs && !aTargetingUs) return 1;

    const nearbyPartyMembers = [];
    if (character.party !== undefined) {
      for (const nearbyCharacter of character.characters.values()) {
        if (nearbyCharacter.party !== character.party) continue; // Different party
        nearbyPartyMembers.push(nearbyCharacter);
      }
    }

    // Prioritize targets that we can get credit for
    if (character.party !== undefined) {
      const aCanGiveCredit =
        a.target === undefined ||
        a.target === character.id ||
        nearbyPartyMembers.some((partyMember) => partyMember.id === a.target);
      const bCanGiveCredit =
        b.target === undefined ||
        b.target === character.id ||
        nearbyPartyMembers.some((partyMember) => partyMember.id === b.target);
      if (aCanGiveCredit && !bCanGiveCredit) return -1;
      if (!aCanGiveCredit && bCanGiveCredit) return 1;
    }

    const aDistance = character.getDistanceTo(a);
    const bDistance = character.getDistanceTo(b);

    // Prioritize monsters further away from party members
    let minDistanceToA = aDistance;
    let minDistanceToB = bDistance;
    if (nearbyPartyMembers.length) {
      // Check if we're the closest to the monster
      let weAreClosestToA = true;
      let weAreClosestToB = true;
      for (const partyMember of nearbyPartyMembers) {
        const playerDistanceToA = a.getDistanceTo(partyMember);
        if (playerDistanceToA < aDistance) weAreClosestToA = false;
        if (playerDistanceToA < minDistanceToA) minDistanceToA = playerDistanceToA;
        const playerDistanceToB = b.getDistanceTo(partyMember);
        if (playerDistanceToB < bDistance) weAreClosestToB = false;
        if (playerDistanceToB < minDistanceToB) minDistanceToB = playerDistanceToB;
      }

      // Return if we're the closest to one of them
      if (weAreClosestToA) return -1;
      if (weAreClosestToB) return 1;

      // Return the one that's further away from other members of the party
      if (minDistanceToA > minDistanceToB) return -1;
      if (minDistanceToB > minDistanceToA) return 1;
      return 0;
    }

    // Prioritize closer monsters
    return aDistance - bDistance;
  };
}

/**
 * Starts the move logic for the given character
 * @param character
 * @param monster
 */
export const setup = (character: Character, monster: MonsterKey = "goo") => {
  active.add(character);

  const comparator = getComparator(character);
  const moveLoop = () => {
    if (!active.has(character)) return; // Stop

    try {
      if (character.socket.disconnected) return;

      const entity = getBestTarget(character, { comparator, monster });
      if (!entity) return;

      // Move if far away
      if (character.getDistanceTo(entity) > character.range) {
        character.move((entity.x + character.x) / 2, (entity.y + character.y) / 2).catch(logDebug);
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(e);
    } finally {
      setTimeout(moveLoop, 100);
    }
  };
  moveLoop();
};

/**
 * Stops the move logic for the given character
 * @param character
 */
export const teardown = (character: Character) => {
  active.delete(character);
};
