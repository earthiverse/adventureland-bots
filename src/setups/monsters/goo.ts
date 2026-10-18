import type { CharacterType } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const GOO_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'goo' });
const GOO_MOVE_STRATEGY = new MoveStrategy({ targetType: 'goo' });
const COMBAT_CLASSES = ['mage', 'paladin', 'priest', 'ranger', 'rogue', 'warrior'] as const satisfies CharacterType[];

// TODO: Actual strategies per class

export const gooSetups: Setups = COMBAT_CLASSES.map((ctype) => ({
  priority: (bots) => getPriority(bots, { typeList: ['goo'] }),
  configs: [
    {
      ctype,
      strategies: [GOO_ATTACK_STRATEGY, GOO_MOVE_STRATEGY],
    },
  ],
}));
