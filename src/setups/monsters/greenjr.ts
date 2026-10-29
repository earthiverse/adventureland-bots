import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const GREENJR_ATTACK_STRATEGY = new AttackStrategy({ type: 'greenjr' });
const GREENJR_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'greenjr' });

// TODO: Actual strategies per class

export const greenjrSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['greenjr'] }),
    configs: [
      {
        strategies: [GREENJR_ATTACK_STRATEGY, GREENJR_MOVE_STRATEGY],
      },
    ],
  },
];
