import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const GOO_ATTACK_STRATEGY = new AttackStrategy({ type: 'goo' });
const GOO_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'goo' });

// TODO: Actual strategies per class

export const gooSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['goo'] }),
    configs: [
      {
        strategies: [GOO_ATTACK_STRATEGY, GOO_MOVE_STRATEGY],
      },
    ],
  },
];
