import type { PingCompensatedCharacter } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { KiteMoveStrategy } from '@/strategies/move/kite';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { canKite } from '@/utils/combat';
import { getPriority } from '@/utils/priority';

const XSCORPION_ATTACK_STRATEGY = new AttackStrategy({ type: 'xscorpion' });
const XSCORPION_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'xscorpion' });
const XSCORPION_MOVE_STRATEGY = new KiteMoveStrategy({ type: 'xscorpion' });

const require = (bot: PingCompensatedCharacter): boolean => canKite(bot, 'xscorpion');

// TODO: Actual strategies per class
// TODO: require with minimum stats

export const xscorpionSetups: Setups = [
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['xscorpion'] }),
    configs: [
      {
        ctype: 'ranger',
        require,
        strategies: [XSCORPION_RANGER_ATTACK_STRATEGY, XSCORPION_MOVE_STRATEGY],
      },
    ],
  },
  {
    priority: (bots) => getPriority(bots, { typeList: ['xscorpion'] }),
    configs: [
      {
        require,
        strategies: [XSCORPION_ATTACK_STRATEGY, XSCORPION_MOVE_STRATEGY],
      },
    ],
  },
];
