import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const MINIMUSH_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'minimush' });
const MINIMUSH_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ targetType: 'minimush' });
const MINIMUSH_MOVE_STRATEGY = new BasicMoveStrategy({ targetType: 'minimush' });

// TODO: Actual strategies per class

export const minimushSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['minimush'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [MINIMUSH_RANGER_ATTACK_STRATEGY, MINIMUSH_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['minimush'] }),
    configs: [
      {
        strategies: [MINIMUSH_ATTACK_STRATEGY, MINIMUSH_MOVE_STRATEGY],
      },
    ],
  },
];
