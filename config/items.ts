import type { ClassKey, ItemKey } from "typed-adventureland";

export type HoldConfig = {
  action: "hold";
  characterTypes: "all" | ClassKey[];
};

export type ListConfig = {
  /** We want to list the item for sale on our stand */
  action: "list";
  listPrice: number;
  /** If set, we will list special items (items with a `.p`), too */
  specialMultiplier?: number;
};

export type MailConfig = {
  /** We want to mail the item to ourselves, or another player */
  action: "mail";
  recipient: string;
  mailSpecial?: true;
};

export type SellConfig = {
  /** We want to sell the item to either a player or NPC */
  action: "sell";
  sellPrice: number | "npc";
  /** If set, we will sell special items (items with a `.p`), too */
  specialMultiplier?: number;
};

export type Config = Partial<
  Record<ItemKey, HoldConfig | ListConfig | MailConfig | SellConfig>
>;

const config: Config = {
  slimestaff: {
    action: "sell",
    sellPrice: "npc",
  },
};

export default config;
