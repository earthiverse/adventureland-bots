import type { ClassKey, ItemKey } from "typed-adventureland";

/**
 * When set to a number, we will buy the item if it's that price or lower.
 * When set to "ponty", we will buy the item at the price Ponty (Secondhand) sells it for.
 * When set to "g", we will buy the item at the price listed in G.
 * When set to "goblin", we will buy the item at the price Goblin (Lost and Found) sells it for.
 * When set to "npc", we will buy the item at the price an NPC would buy it for.
 * When set to "x${number}", we will buy the item for its base price multiplied by the number.
 */
export type Price = number | "g" | "goblin" | "npc" | "ponty" | `x${number}`;
export type BuyConfigBase = {
  /**
   * When set to an object, we will buy the item at that level for the specified price.
   * Otherwise, the buy price is for the level 0 item.
   */
  buyPrice: Price | Record<number, Price>;
};

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
  /** If set, we will try to keep this many of the given item on our bots */
  replenish?: number;
  /** If set, we will attempt to place the specified item in the specified position in the inventory */
  position?: number;
};

export type ListConfigBase = {
  /** How much we want to list the item for */
  listPrice: Price | Record<number, Price>;
  /** If set, we will list special items (items with a `.p`), too */
  specialMultiplier?: number;
};

export type MailConfigBase = {
  /** We will only mail items until this level */
  mailUntilLevel: number;
  /** Who we want to mail the item to */
  recipient: string;
  /** If set, we will mail special items (items with a `.p`, too) */
  mailSpecial?: true;
};

export type SellConfigBase = {
  /**
   * If set to "npc" or a number, we will sell level 0 items to an NPC or at the specified price to other players.
   * If set to an object, we will sell that level of item to an NPC or at the specified price to other players.
   */
  sellPrice: Price | Record<number, Price>;
  /** If set, we will sell special items (items with a `.p`), too at `sellPrice * specialMultiplier` */
  specialMultiplier?: number;
};

export type UpgradeConfigBase = {
  /** We will only upgrade items until this level */
  upgradeUntilLevel: number;
  /** If set, we will make level 0 items shiny before upgrading them */
  makeShinyBeforeUpgrading?: true;
  /** If set, we will upgrade special items (items with a `.p`), too */
  upgradeSpecial?: true;
};

export type ItemConfig = {
  buy?: BuyConfigBase;
  destroy?: DestroyConfigBase;
  hold?: HoldConfigBase;
  list?: ListConfigBase;
  mail?: MailConfigBase;
  sell?: SellConfigBase;
  upgrade?: UpgradeConfigBase;
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
