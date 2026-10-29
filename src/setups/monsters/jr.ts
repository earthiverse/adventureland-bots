import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const JR_ATTACK_STRATEGY = new AttackStrategy({ type: 'jr' });
const JR_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'jr' });

// TODO: Actual strategies per class

export const jrSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['jr'] }),
    configs: [
      {
        strategies: [JR_ATTACK_STRATEGY, JR_MOVE_STRATEGY],
      },
    ],
  },
];
