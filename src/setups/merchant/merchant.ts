import type { Character } from "alclient";
import { logDebug } from "../../utilities/logging.js";

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Character, ActiveData>();

type MerchantOptions = {
  /** List of characters that the Merchant will perform actions on */
  characters: Character[];
  /** If enabled, we will go transfer gold to/from these characters */
  enableGoldTransfer?: {
    /** How much gold each player should have */
    amountToHold: number;
    whenGoldIsOverAmount?: number;
    whenGoldIsUnderAmount?: number;
  };
};

// TODO: Add active characters, and check if they are the best looter

/**
 * Starts the merchant logic for the given character
 * @param character
 */
export const setup = (character: Character, options: MerchantOptions) => {
  checkOptions(options);

  // Cancel any existing loot logic for this character
  if (active.has(character)) active.get(character)!.cancelled = true;

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);

  const moveLoop = async () => {
    if (activeData.cancelled) return;

    try {
      if (character.socket.disconnected) return;
      if (!character.canMove()) return;

      await doGoldTransfer(character, options);

      // TODO: Banking
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`moveLoop: ${e}`);
    } finally {
      setTimeout(() => void moveLoop(), 100);
    }
  };
  void moveLoop();
};

/**
 * Stops the loot logic for the given character
 * @param character
 */
export function teardown(character: Character) {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
}

function checkOptions(options: MerchantOptions) {
  if (options.enableGoldTransfer !== undefined) {
    if (options.enableGoldTransfer.amountToHold <= 0) throw new Error("amountToHold must be greater than 0");

    if (
      options.enableGoldTransfer.whenGoldIsOverAmount === undefined &&
      options.enableGoldTransfer.whenGoldIsUnderAmount === undefined
    )
      throw new Error("No gold transfer options specified");

    if (
      options.enableGoldTransfer.whenGoldIsOverAmount !== undefined &&
      options.enableGoldTransfer.whenGoldIsOverAmount <= options.enableGoldTransfer.amountToHold
    )
      throw new Error("whenGoldIsOverAmount must be greater than amountToHold");

    if (
      options.enableGoldTransfer.whenGoldIsUnderAmount !== undefined &&
      options.enableGoldTransfer.whenGoldIsUnderAmount >= options.enableGoldTransfer.amountToHold
    )
      throw new Error("whenGoldIsUnderAmount must be less than amountToHold");
  }
}

async function doGoldTransfer(character: Character, options: MerchantOptions) {
  if (options.enableGoldTransfer === undefined) return; // Not enabled

  for (const other of options.characters) {
    if (other.id === character.id) continue; // Skip ourself

    if (
      options.enableGoldTransfer.whenGoldIsOverAmount !== undefined &&
      other.gold >= options.enableGoldTransfer.whenGoldIsOverAmount
    ) {
      // Go take gold from them
      await character.smartMove(other); // TODO: Get within
      const amount = other.gold - options.enableGoldTransfer.whenGoldIsOverAmount;
      if (amount > 0) await other.sendGold(character.id, amount);
    } else if (
      options.enableGoldTransfer.whenGoldIsUnderAmount !== undefined &&
      other.gold <= options.enableGoldTransfer.whenGoldIsUnderAmount && // They don't have enough gold
      character.gold >= options.enableGoldTransfer.amountToHold // We have enough gold
    ) {
      // Go give gold to them
      await character.smartMove(other); // TODO: Get within
      const amount = Math.min(
        character.gold - options.enableGoldTransfer.amountToHold, // How much extra gold we have
        options.enableGoldTransfer.amountToHold - other.gold, // How much gold they need
      );
      if (amount > 0) await character.sendGold(other.id, amount);
    }
  }
}
