import type { CharacterType } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const CRAB_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'crab' });
const CRAB_MOVE_STRATEGY = new MoveStrategy({ targetType: 'crab' });
const COMBAT_CLASSES = ['mage', 'paladin', 'priest', 'ranger', 'rogue', 'warrior'] as const satisfies CharacterType[];

// TODO: Actual strategies per class

export const crabSetups: Setups = COMBAT_CLASSES.map((ctype) => ({
  priority: (bots) => getPriority(bots, { typeList: ['crab'] }),
  configs: [
    {
      ctype,
      strategies: [CRAB_ATTACK_STRATEGY, CRAB_MOVE_STRATEGY],
    },
  ],
}));
