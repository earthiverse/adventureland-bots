import type { ClassKey, ItemKey } from "typed-adventureland";

// TODO: Buy config

export type DestroyConfigBase = {
  /** If set, we will destroy special items (items with a `.p`), too */
  destroySpecial?: true;
  /** If set, we will destroy items up to this level (we only destroy level 0 items by default) */
  destroyUpToLevel?: number;
};

export type HoldConfigBase = {
  /**
   * If set to "all", we will hold the item on all character types.
   * If set to an array, we will hold the item on the specified character types.
   */
  characterTypes: "all" | ClassKey[];
  /** If set, we should try to keep this many of the given item on our bots */
  replenish?: number;
  /** If set, we should attempt to place the specified item in the specified position in the inventory */
  position?: number;
};

export type ListConfigBase = {
  /** How much we want to list the item for */
  listPrice: number;
  /** If set, we will list special items (items with a `.p`), too */
  specialMultiplier?: number;
};

export type MailConfigBase = {
  /** Who we want to mail the item to */
  recipient: string;
  /** If set, we will mail special items (items with a `.p`, too) */
  mailSpecial?: true;
};

export type SellConfigBase = {
  /**
   * If set to "npc" or a number, we will sell level 0 items to an NPC or at the specified price to other players.
   * If set to an array, we will sell that level of item to an NPC or at the specified price to other players.
   */
  sellPrice: (number | "npc") | Record<number, number | "npc">;
  /** If set, we will sell special items (items with a `.p`), too */
  specialMultiplier?: number;
};

// TODO: Upgrade config

export type ItemConfig = {
  /** We want to destroy the item */
  destroy?: DestroyConfigBase;
  /** We want to hold the item */
  hold?: HoldConfigBase;
  /** We want to list the item for sale on our stand */
  list?: ListConfigBase;
  /** We want to mail the item to ourselves, or another player */
  mail?: MailConfigBase;
  /** We want to sell the item to either a player or NPC */
  sell?: SellConfigBase;
};

export type Config = Partial<Record<ItemKey, ItemConfig>>;

const DESTROY: ItemConfig = Object.freeze({ destroy: {} });
const HOLD_FULL_STACK: ItemConfig = Object.freeze({ hold: { characterTypes: "all", replenish: 9999 } });
const SELL_TO_NPC: ItemConfig = Object.freeze({ sell: { sellPrice: "npc" } });

const config: Config = {
  cclaw: {
    ...DESTROY,
  },
  crabclaw: {
    ...SELL_TO_NPC,
  },
  hpamulet: {
    ...SELL_TO_NPC,
  },
  hpbelt: {
    ...SELL_TO_NPC,
  },
  hpot1: {
    ...HOLD_FULL_STACK,
  },
  mpot1: {
    ...HOLD_FULL_STACK,
  },
  slimestaff: {
    ...DESTROY,
  },
  vitring: {
    ...SELL_TO_NPC,
  },
};

export default config;
