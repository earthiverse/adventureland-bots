import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const SCORPION_ATTACK_STRATEGY = new AttackStrategy({ type: 'scorpion' });
const SCORPION_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'scorpion' });
const SCORPION_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'scorpion' });

// TODO: Actual strategies per class

export const scorpionSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['scorpion'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [SCORPION_RANGER_ATTACK_STRATEGY, SCORPION_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['scorpion'] }),
    configs: [
      {
        strategies: [SCORPION_ATTACK_STRATEGY, SCORPION_MOVE_STRATEGY],
      },
    ],
  },
];
