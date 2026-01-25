import { isItemKey, type Character, type Paladin } from "alclient";
import type { Comparator } from "tinyqueue";
import TinyQueue from "tinyqueue";
import type { ItemKey, SkillKey } from "typed-adventureland";
import { REGEN_ITEMS } from "../../../config/items.js";
import { logDebug } from "../../utilities/logging.js";

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Character, ActiveData>();

export function calculateItemScore(
  item: ItemKey,
  character: Pick<Character, "max_hp" | "hp" | "max_mp" | "mp" | "game">,
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
    case "selfheal":
      givesHp =
        character.game.G.skills.selfheal?.levels?.findLast(([reqLevel]) => character.level >= reqLevel)?.[1] ?? 0;
      break;
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
  // Cancel any existing regen logic for this character
  if (active.has(character)) active.get(character)!.cancelled = true;

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);

  const comparator = getComparator(character);

  const regenLoop = async () => {
    if (activeData.cancelled) return;

    try {
      if (character.socket.disconnected) return;

      const missingHp = character.max_hp - character.hp;
      const missingMp = character.max_mp - character.mp;
      if (missingHp <= 0 && missingMp <= 0) return; // We are full

      const bestActions = new TinyQueue<ItemKey | SkillKey>(
        [
          "regen_hp",
          "regen_mp",
          ...(character.ctype === "paladin" && character.canUse("selfheal") ? (["selfheal"] as SkillKey[]) : []),
          ...REGEN_ITEMS.filter((name) => character.items.some((item) => item?.name === name)),
        ],
        comparator,
      );

      const bestAction = bestActions.pop();
      if (bestAction === undefined) {
        return;
      } else if (bestAction === "regen_hp") {
        await character.regenHp();
      } else if (bestAction === "regen_mp") {
        await character.regenMp();
      } else if (bestAction === "selfheal") {
        await (character as Paladin).selfHeal();
      } else if (isItemKey(bestAction, character.game.G)) {
        await character.consumeItem(character.locateItem({ name: bestAction }) as number);
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`regenLoop: ${e}`);
    } finally {
      setTimeout(
        () => void regenLoop(),
        Math.max(
          100,
          Math.min(
            character.getTimeout("use_mp"),
            character.ctype === "paladin" ? character.getTimeout("selfheal") : Number.POSITIVE_INFINITY,
          ),
        ),
      );
    }
  };
  void regenLoop();
};

/**
 * Stops the regen logic for the given character
 * @param character
 */
export const teardown = (character: Character) => {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
};
