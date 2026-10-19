import type { CharacterType } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const TORTOISE_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'tortoise' });
const TORTOISE_MOVE_STRATEGY = new MoveStrategy({ targetType: 'tortoise' });
const COMBAT_CLASSES = ['mage', 'paladin', 'priest', 'ranger', 'rogue', 'warrior'] as const satisfies CharacterType[];

// TODO: Actual strategies per class

export const tortoiseSetups: Setups = COMBAT_CLASSES.map((ctype) => ({
  priority: (bots) => getPriority(bots, { typeList: ['tortoise'] }),
  configs: [
    {
      ctype,
      strategies: [TORTOISE_ATTACK_STRATEGY, TORTOISE_MOVE_STRATEGY],
    },
  ],
}));
