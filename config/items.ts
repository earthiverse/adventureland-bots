import type { ClassKey, ItemKey } from "typed-adventureland";

export type DestroyConfig = {
  /** We want to destroy the item */
  action: "destroy";
  /** If set, we will destroy special items (items with a `.p`), too */
  destroySpecial?: true;
};

export type HoldConfig = {
  /** We want to hold the item */
  action: "hold";
  /**
   * If set to "all", we will hold the item on all character types.
   * If set to an array, we will hold the item on the specified character types.
   */
  characterTypes: "all" | ClassKey[];
  /** If set, we should attempt to place the specified item in the specified position in the inventory */
  position?: number;
};

export type ListConfig = {
  /** We want to list the item for sale on our stand */
  action: "list";
  /** How much we want to list the item for */
  listPrice: number;
  /** If set, we will list special items (items with a `.p`), too */
  specialMultiplier?: number;
};

export type MailConfig = {
  /** We want to mail the item to ourselves, or another player */
  action: "mail";
  /** Who we want to mail the item to */
  recipient: string;
  /** If set, we will mail special items (items with a `.p`, too) */
  mailSpecial?: true;
};

export type SellConfig = {
  /** We want to sell the item to either a player or NPC */
  action: "sell";
  /**
   * If set to "npc" or a number, we will sell level 0 items to an NPC or at the specified price to other players.
   * If set to an array, we will sell that level of item to an NPC or at the specified price to other players.
   */
  sellPrice: (number | "npc") | Record<number, number | "npc">;
  /** If set, we will sell special items (items with a `.p`), too */
  specialMultiplier?: number;
};

// TODO: Upgrade config

export type Config = Partial<Record<ItemKey, DestroyConfig | HoldConfig | ListConfig | MailConfig | SellConfig>>;

const config: Config = {
  cclaw: {
    action: "destroy",
  },
  crabclaw: {
    action: "sell",
    sellPrice: "npc",
  },
  hpamulet: {
    action: "sell",
    sellPrice: "npc",
  },
  hpbelt: {
    action: "sell",
    sellPrice: "npc",
  },
  slimestaff: {
    action: "destroy",
  },
  vitring: {
    action: "sell",
    sellPrice: "npc",
  },
};

export default config;
