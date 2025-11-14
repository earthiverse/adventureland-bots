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

export type CraftConfigBase = {
  /** If set, we will craft with special items (items with a `.p`), too */
  craftWithSpecial?: true;
  /** If set, we will make level 0 items shiny before crafting with them */
  makeShinyBeforeCrafting?: true;
};

export type DestroyConfigBase = {
  /** If set, we will destroy special items (items with a `.p`), too */
  destroySpecial?: true;
  /** If set, we will destroy items up to this level (we only destroy level 0 items by default) */
  destroyUpToLevel?: number;
};

export type DismantleConfigBase = {
  /** If set, we will dismantle special items (items with a `.p`), too */
  dismantleSpecial?: true;
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

export type ExchangeConfigBase = {
  /** If set, we will exchange the item only at this level (currently only applicable to `lostearring`s) */
  exchangeAtLevel?: number;
};

export type ListConfigBase = {
  /** How much we want to list the item for */
  listPrice: Price | Record<number, Price>;
  /** If set, we will list special items (items with a `.p`), too */
  specialMultiplier?: number;
};

export type MailConfigBase = {
  // TODO: Make it like SellConfigBase, or BuyConfigBase, so we can specify which level to mail
  /** We will only mail items until this level */
  mailUntilLevel: number;
  /** Who we want to mail the item to */
  recipient: string;
  /** If set, we will mail special items (items with a `.p`, too) */
  mailSpecial?: true;
};

// TODO: Config to sell items we have an excess of
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
  // TODO: Add strategy
};

export type ItemConfig = {
  buy?: BuyConfigBase;
  craft?: CraftConfigBase;
  destroy?: DestroyConfigBase;
  dismantle?: DismantleConfigBase;
  exchange?: ExchangeConfigBase;
  hold?: HoldConfigBase;
  list?: ListConfigBase;
  mail?: MailConfigBase;
  sell?: SellConfigBase;
  upgrade?: UpgradeConfigBase;
};

export type ItemsConfig = Partial<Record<ItemKey, ItemConfig>>;

export const BUY_AT_GOBLIN_PRICE: ItemConfig = Object.freeze({ buy: Object.freeze({ buyPrice: "goblin" }) });
export const BUY_AT_PONTY_PRICE: ItemConfig = Object.freeze({ buy: Object.freeze({ buyPrice: "ponty" }) });
export const CRAFT: ItemConfig = Object.freeze({ craft: Object.freeze({ craftWithSpecial: true }) });
export const DESTROY: ItemConfig = Object.freeze({ destroy: Object.freeze({ destroySpecial: true }) });
export const DISMANTLE: ItemConfig = Object.freeze({ dismantle: Object.freeze({ dismantleSpecial: true }) });
export const EXCHANGE: ItemConfig = Object.freeze({ exchange: Object.freeze({}) });
export const HOLD_FULL_STACK: ItemConfig = Object.freeze({
  hold: Object.freeze({ characterTypes: "all", replenish: 9999 }),
});
export const SELL_TO_NPC: ItemConfig = Object.freeze({ sell: Object.freeze({ sellPrice: "npc" }) });

const itemsConfig: ItemsConfig = {
  "5bucks": {
    buy: {
      buyPrice: 100_000_000,
    },
  },
  amuletofm: {
    buy: {
      buyPrice: 500_000_000,
    },
  },
  angelwings: {
    ...BUY_AT_GOBLIN_PRICE,
  },
  armorbox: {
    ...BUY_AT_GOBLIN_PRICE,
    ...EXCHANGE,
  },
  cclaw: {
    ...BUY_AT_PONTY_PRICE,
    ...CRAFT,
  },
  crabclaw: {
    // Used to craft cclaw
    ...BUY_AT_PONTY_PRICE,
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
  lostearring: {
    exchange: {
      exchangeAtLevel: 2,
    },
  },
  mpot1: {
    ...HOLD_FULL_STACK,
  },
  orba: {
    ...BUY_AT_GOBLIN_PRICE,
    ...CRAFT,
  },
  orboffire: {
    // Used to craft orba
    ...BUY_AT_GOBLIN_PRICE,
  },
  orboffrost: {
    // Used to craft orba
    ...BUY_AT_GOBLIN_PRICE,
  },
  orbofplague: {
    // Used to craft orba
    ...BUY_AT_GOBLIN_PRICE,
  },
  orbofresolve: {
    // Used to craft orba
    ...BUY_AT_GOBLIN_PRICE,
  },
  slimestaff: {
    ...SELL_TO_NPC,
  },
  vitring: {
    // We craft from level 2, higher level vitrings are not needed
    buy: {
      buyPrice: {
        0: "ponty",
        1: "ponty",
        2: "ponty",
      },
    },
    upgrade: {
      upgradeUntilLevel: 2,
    },
  },
};

export default itemsConfig;
