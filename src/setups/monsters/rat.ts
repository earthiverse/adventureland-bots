import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const RAT_ATTACK_STRATEGY = new AttackStrategy({ type: 'rat' });
const RAT_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'rat' });
const RAT_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'rat' });

// TODO: Actual strategies per class

export const ratSetups: Setups = [
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['rat'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [RAT_RANGER_ATTACK_STRATEGY, RAT_MOVE_STRATEGY],
      },
    ],
  },
  {
    priority: (bots) => getPriority(bots, { typeList: ['rat'] }),
    configs: [
      {
        strategies: [RAT_ATTACK_STRATEGY, RAT_MOVE_STRATEGY],
      },
    ],
  },
];
