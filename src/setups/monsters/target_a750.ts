import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const TARGETA750_ATTACK_STRATEGY = new AttackStrategy({ type: 'target_a750' });
const TARGETA750_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'target_a750' });
const TARGETA750_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'target_a750' });

// TODO: Actual strategies per class

export const targeta750Setups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['target_a750'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [TARGETA750_RANGER_ATTACK_STRATEGY, TARGETA750_MOVE_STRATEGY],
      },
    ],
  },

  {
    priority: (bots) => getPriority(bots, { typeList: ['target_a750'] }),
    configs: [
      {
        strategies: [TARGETA750_ATTACK_STRATEGY, TARGETA750_MOVE_STRATEGY],
      },
    ],
  },
];
