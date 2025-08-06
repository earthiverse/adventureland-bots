import type { Character, Game } from "alclient";
import type { Comparator } from "tinyqueue";
import TinyQueue from "tinyqueue";
import type { ItemKey, SkillKey } from "typed-adventureland";
import { logDebug } from "../../utilities/logging.js";

/** Which items we want to use to heal / regen */
// TODO: Move this to item config
export const REGEN_ITEMS: ItemKey[] = ["hpot0", "hpot1", "mpot0", "mpot1"];

const active = new Set<Character>();

export function calculateItemScore(
  item: ItemKey,
  character: { max_hp: number; hp: number; max_mp: number; mp: number; game: Game },
): number {
  const missingHp = character.max_hp - character.hp;
  const missingMp = character.max_mp - character.mp;

  const gItem = character.game.G.items[item];
  const givesHp = (gItem.gives ?? []).reduce((hp, item) => hp + (item[0] == "hp" ? item[1] : 0), 0);
  const givesMp = (gItem.gives ?? []).reduce((mp, item) => mp + (item[0] == "mp" ? item[1] : 0), 0);

  const effectiveHp = Math.min(givesHp, missingHp);
  const effectiveMp = Math.min(givesMp, missingMp);
  const effectiveScore = effectiveHp + effectiveMp;

  const overHp = givesHp - effectiveHp;
  const overMp = givesMp - effectiveMp;
  const overPenalty = overHp + overMp;

  return effectiveScore - overPenalty;
}

export function calculateSkillScore(skill: SkillKey, character: Character): number {
  const missingHp = character.max_hp - character.hp;
  const missingMp = character.max_mp - character.mp;

  let givesHp = 0;
  let givesMp = 0;
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (skill) {
    case "regen_hp":
      givesHp = 50;
      break;
    case "regen_mp":
      givesMp = 100;
      break;
    // TODO: Paladin heal?
    default:
      break;
  }

  // If using the skill won't do anything, return a very low score
  if (missingHp <= 0 && missingMp > 0 && givesHp > 0 && givesMp <= 0) return Number.NEGATIVE_INFINITY;
  if (missingMp <= 0 && missingHp > 0 && givesMp > 0 && givesHp <= 0) return Number.NEGATIVE_INFINITY;

  const effectiveHp = Math.min(givesHp, missingHp);
  const effectiveMp = Math.min(givesMp, missingMp);
  const effectiveScore = effectiveHp + effectiveMp;

  const overHp = givesHp - effectiveHp;
  const overMp = givesMp - effectiveMp;
  const overPenalty = overHp + overMp;

  return effectiveScore - overPenalty;
}

export function getComparator(character: Character): Comparator<ItemKey | SkillKey> {
  return (a, b) => {
    let aScore = 0;
    if (character.game.G.items[a as ItemKey] !== undefined) {
      aScore = calculateItemScore(a as ItemKey, character);
    } else {
      aScore = calculateSkillScore(a as SkillKey, character);
    }

    let bScore = 0;
    if (character.game.G.items[b as ItemKey] !== undefined) {
      bScore = calculateItemScore(b as ItemKey, character);
    } else {
      bScore = calculateSkillScore(b as SkillKey, character);
    }

    return bScore - aScore;
  };
}

/**
 * Starts the regen logic for the given character
 * @param character
 */
export const setup = (character: Character) => {
  active.add(character);

  const regenLoop = async () => {
    if (!active.has(character)) return;

    try {
      if (character.socket.disconnected) return;

      const missingHp = character.max_hp - character.hp;
      const missingMp = character.max_mp - character.mp;
      if (missingHp <= 0 && missingMp <= 0) return; // We are full

      const bestActions = new TinyQueue<ItemKey | SkillKey>(["regen_hp", "regen_mp"], getComparator(character));

      // TODO: Add use of items
      // for (const item of character.items) {
      //   if (!item) continue; // Empty slot
      //   if (!REGEN_ITEMS.includes(item.name)) continue; // Not an item we want to use
      //   bestActions.push(item.name);
      // }

      const bestAction = bestActions.pop();
      if (bestAction === "regen_hp") {
        await character.regenHp();
      } else if (bestAction === "regen_mp") {
        await character.regenMp();
      } else {
        // TODO: Add use
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(e);
    } finally {
      setTimeout(() => void regenLoop(), Math.max(100, character.getTimeout("use_mp")));
    }
  };
  void regenLoop();
};

/**
 * Stops the regen logic for the given character
 * @param character
 */
export const teardown = (character: Character) => {
  active.delete(character);
};
