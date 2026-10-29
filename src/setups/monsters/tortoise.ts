import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const TORTOISE_ATTACK_STRATEGY = new AttackStrategy({ type: 'tortoise' });
const TORTOISE_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'tortoise' });
const TORTOISE_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'tortoise' });

// TODO: Actual strategies per class

export const tortoiseSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['tortoise'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [TORTOISE_RANGER_ATTACK_STRATEGY, TORTOISE_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['tortoise'] }),
    configs: [
      {
        strategies: [TORTOISE_ATTACK_STRATEGY, TORTOISE_MOVE_STRATEGY],
      },
    ],
  },
];
