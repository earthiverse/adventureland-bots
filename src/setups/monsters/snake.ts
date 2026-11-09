import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const SNAKE_ATTACK_STRATEGY = new AttackStrategy({ typeList: ['osnake', 'snake'] });
const SNAKE_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ typeList: ['osnake', 'snake'] });
const SNAKE_MOVE_STRATEGY = new BasicMoveStrategy({ typeList: ['osnake', 'snake'] });

// TODO: Prioritize osnakes
// TODO: Actual strategies per class

export const snakeSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['osnake', 'snake'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [SNAKE_RANGER_ATTACK_STRATEGY, SNAKE_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['osnake', 'snake'] }),
    configs: [
      {
        strategies: [SNAKE_ATTACK_STRATEGY, SNAKE_MOVE_STRATEGY],
      },
    ],
  },
];
