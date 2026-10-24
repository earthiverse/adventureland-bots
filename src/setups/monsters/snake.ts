import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const SNAKE_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'snake' });
const SNAKE_MOVE_STRATEGY = new MoveStrategy({ targetType: 'snake' });

// TODO: Actual strategies per class

export const snakeSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['snake'] }),
    configs: [
      {
        strategies: [SNAKE_ATTACK_STRATEGY, SNAKE_MOVE_STRATEGY],
      },
    ],
  },
];
