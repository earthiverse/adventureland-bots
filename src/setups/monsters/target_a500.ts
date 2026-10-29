import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const TARGETA500_ATTACK_STRATEGY = new AttackStrategy({ type: 'target_a500' });
const TARGETA500_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'target_a500' });
const TARGETA500_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'target_a500' });

// TODO: Actual strategies per class

export const targeta500Setups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['minimush'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [TARGETA500_RANGER_ATTACK_STRATEGY, TARGETA500_MOVE_STRATEGY],
      },
    ],
  },

  {
    priority: (bots) => getPriority(bots, { typeList: ['target_a500'] }),
    configs: [
      {
        strategies: [TARGETA500_ATTACK_STRATEGY, TARGETA500_MOVE_STRATEGY],
      },
    ],
  },
];
