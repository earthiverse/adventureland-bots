import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const PHOENIX_ATTACK_STRATEGY = new AttackStrategy({ type: 'phoenix' });
const PHOENIX_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'phoenix' });
const PHOENIX_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'phoenix' });

// TODO: Actual strategies per class

export const phoenixSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['minimush'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [PHOENIX_RANGER_ATTACK_STRATEGY, PHOENIX_MOVE_STRATEGY],
      },
    ],
  },

  {
    priority: (bots) => getPriority(bots, { typeList: ['phoenix'] }),
    configs: [
      {
        strategies: [PHOENIX_ATTACK_STRATEGY, PHOENIX_MOVE_STRATEGY],
      },
    ],
  },
];
