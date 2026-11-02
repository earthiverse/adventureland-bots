import type { CharacterType, ItemName } from 'alclient';

/**
 * When set to a number, explicit gold price.
 * When set to 'g', base item value from G.items[name].g.
 * When set to 'npc', price an NPC buys it for (g * G.multipliers.buy_to_sell).
 * When set to 'ponty', price Ponty (secondhand) sells it for.
 * When set to 'goblin', price Lost and Found sells it for.
 * When set to `x${number}`, item value multiplied by that number.
 */
export type Price = number | 'g' | 'goblin' | 'npc' | 'ponty' | `x${number}`;

export interface BuyConfig {
  /**
   * When set to an object, price per item level.
   * Otherwise, price for level 0.
   */
  buyPrice: Price | Record<number, Price>;
}

export interface CraftConfig {
  /** If set, allow crafting with special items (.p) */
  craftWithSpecial?: boolean;
  /** If set, make level 0 items shiny before crafting with them */
  makeShinyBeforeCrafting?: boolean;
}

export interface DestroyConfig {
  /** If set, allow sacrificing special items (.p) to the statue */
  destroySpecial?: boolean;
  /** Sacrifice items up to this level (default: level 0 only) */
  destroyUpToLevel?: number;
}

export interface DismantleConfig {
  /** If set, allow dismantling special items (.p) */
  dismantleSpecial?: boolean;
}

export interface ExchangeConfig {
  /** Exchange only when at this specific level (e.g. level 2 for lostearring) */
  exchangeAtLevel?: number;
}

export interface HoldConfig {
  /** Which character classes should hold this item */
  characterTypes: 'all' | readonly CharacterType[] | CharacterType[];
  /** Target quantity to keep in inventory */
  replenish?: number;
  /** Desired inventory slot (0-41) */
  position?: number;
}

export interface ListConfig {
  /** How much we want to list the item for on our merchant stand */
  listPrice: Price | Record<number, Price>;
  /** Multiplier for special items (.p) */
  specialMultiplier?: number;
}

export interface MailConfig {
  /** Only mail items until this level */
  mailUntilLevel: number;
  /** Recipient character name */
  recipient: string;
  /** If set, allow mailing special items (.p) */
  mailSpecial?: boolean;
}

export interface SellConfig {
  /**
   * Price to sell to NPC or other players.
   * When set to an object, specifies price per level.
   */
  sellPrice: Price | Record<number, Price>;
  /** Multiplier for special items (.p) */
  specialMultiplier?: number;
}

export interface UpgradeConfig {
  /** Only upgrade items up to this level */
  upgradeUntilLevel: number;
  /** If set, make level 0 items shiny before upgrading */
  makeShinyBeforeUpgrading?: boolean;
  /** If set, allow upgrading special items (.p) */
  upgradeSpecial?: boolean;
}

export interface ItemConfig {
  /**
   * Account-wide retention count. Protects the top N highest-level copies of this item
   * across all active bots and bank from destructive actions (sell, destroy, list, dismantle).
   */
  keep?: number;
  buy?: BuyConfig;
  craft?: CraftConfig;
  destroy?: DestroyConfig;
  dismantle?: DismantleConfig;
  exchange?: ExchangeConfig;
  hold?: HoldConfig;
  list?: ListConfig;
  mail?: MailConfig;
  sell?: SellConfig;
  upgrade?: UpgradeConfig;
}

export type ItemsConfig = Partial<Record<ItemName, ItemConfig>>;
