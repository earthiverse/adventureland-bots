import type { CharacterType } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const PHOENIX_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'phoenix' });
const PHOENIX_MOVE_STRATEGY = new MoveStrategy({ targetType: 'phoenix' });
const COMBAT_CLASSES = ['mage', 'paladin', 'priest', 'ranger', 'rogue', 'warrior'] as const satisfies CharacterType[];

// TODO: Actual strategies per class

export const phoenixSetups: Setups = COMBAT_CLASSES.map((ctype) => ({
  priority: (bots) => getPriority(bots, { typeList: ['phoenix'] }),
  configs: [
    {
      ctype,
      strategies: [PHOENIX_ATTACK_STRATEGY, PHOENIX_MOVE_STRATEGY],
    },
  ],
}));
