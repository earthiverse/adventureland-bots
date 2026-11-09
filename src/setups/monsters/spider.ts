import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const SPIDER_ATTACK_STRATEGY = new AttackStrategy({ type: 'spider' });
const SPIDER_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'spider' });
const SPIDER_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'spider' });

// TODO: Actual strategies per class

export const spiderSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['spider'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [SPIDER_RANGER_ATTACK_STRATEGY, SPIDER_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['spider'] }),
    configs: [
      {
        strategies: [SPIDER_ATTACK_STRATEGY, SPIDER_MOVE_STRATEGY],
      },
    ],
  },
];
