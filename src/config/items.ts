import type { ItemName } from 'alclient';

import type { ItemsConfig } from '@/types/items';
import { buyAtGoblinPrice, buyAtPontyPrice, craft, exchange, holdFullStack, sellToNpc } from '@/utils/item_config';

export const REGEN_ITEMS: readonly ItemName[] = Object.freeze(['hpot0', 'hpot1', 'mpot0', 'mpot1'] as const);

export const DEFAULT_ITEMS_CONFIG: ItemsConfig = {
  '5bucks': {
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
    ...buyAtGoblinPrice(),
  },
  armorbox: {
    ...buyAtGoblinPrice(),
    ...exchange(),
  },
  cclaw: {
    ...buyAtPontyPrice(),
    ...craft(),
  },
  crabclaw: {
    // Used to craft cclaw
    ...buyAtPontyPrice(),
  },
  hpamulet: {
    ...sellToNpc(),
  },
  hpbelt: {
    ...sellToNpc(),
  },
  hpot1: {
    ...holdFullStack(39),
  },
  lostearring: {
    exchange: {
      exchangeAtLevel: 2,
    },
  },
  mpot1: {
    ...holdFullStack(38),
  },
  offering: {
    ...buyAtPontyPrice(),
  },
  offeringp: {
    buy: {
      buyPrice: 5_000_000,
    },
  },
  orba: {
    ...buyAtGoblinPrice(),
    ...craft(),
  },
  orboffire: {
    // Used to craft orba
    ...buyAtGoblinPrice(),
  },
  orboffrost: {
    // Used to craft orba
    ...buyAtGoblinPrice(),
  },
  orbofplague: {
    // Used to craft orba
    ...buyAtGoblinPrice(),
  },
  orbofresolve: {
    // Used to craft orba
    ...buyAtGoblinPrice(),
  },
  slimestaff: {
    ...sellToNpc(),
  },
  tracker: {
    hold: {
      characterTypes: 'all',
      replenish: 1,
    },
  },
  vitring: {
    // Craft/compound from level 2; higher level vitrings not needed
    buy: {
      buyPrice: {
        0: 'ponty',
        1: 'ponty',
        2: 'ponty',
      },
    },
    upgrade: {
      upgradeUntilLevel: 2,
    },
  },
};

export const ITEMS_CONFIG: ItemsConfig = DEFAULT_ITEMS_CONFIG;
export default ITEMS_CONFIG;
