import type { CharacterType } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const SNAKE_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'snake' });
const SNAKE_MOVE_STRATEGY = new MoveStrategy({ targetType: 'snake' });
const COMBAT_CLASSES = ['mage', 'paladin', 'priest', 'ranger', 'rogue', 'warrior'] as const satisfies CharacterType[];

// TODO: Actual strategies per class

export const snakeSetups: Setups = COMBAT_CLASSES.map((ctype) => ({
  priority: (bots) => getPriority(bots, { typeList: ['snake'] }),
  configs: [
    {
      ctype,
      strategies: [SNAKE_ATTACK_STRATEGY, SNAKE_MOVE_STRATEGY],
    },
  ],
}));
