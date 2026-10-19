import type { CharacterType } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const MINIMUSH_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'minimush' });
const MINIMUSH_MOVE_STRATEGY = new MoveStrategy({ targetType: 'minimush' });
const COMBAT_CLASSES = ['mage', 'paladin', 'priest', 'ranger', 'rogue', 'warrior'] as const satisfies CharacterType[];

// TODO: Actual strategies per class

export const minimushSetups: Setups = COMBAT_CLASSES.map((ctype) => ({
  priority: (bots) => getPriority(bots, { typeList: ['minimush'] }),
  configs: [
    {
      ctype,
      strategies: [MINIMUSH_ATTACK_STRATEGY, MINIMUSH_MOVE_STRATEGY],
    },
  ],
}));
