import type { PingCompensatedCharacter } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { KiteMoveStrategy } from '@/strategies/move/kite';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { canKite } from '@/utils/combat';
import { getPriority } from '@/utils/priority';

const STONEWORM_ATTACK_STRATEGY = new AttackStrategy({ type: 'stoneworm' });
const STONEWORM_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'stoneworm' });
const STONEWORM_MOVE_STRATEGY = new KiteMoveStrategy({ type: 'stoneworm' });

const require = (bot: PingCompensatedCharacter): boolean => canKite(bot, 'stoneworm');

// TODO: Actual strategies per class

export const stonewormSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['stoneworm'] }),
    configs: [
      {
        ctype: 'ranger',
        require,
        strategies: [STONEWORM_RANGER_ATTACK_STRATEGY, STONEWORM_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['stoneworm'] }),
    configs: [
      {
        require,
        strategies: [STONEWORM_ATTACK_STRATEGY, STONEWORM_MOVE_STRATEGY],
      },
    ],
  },
];
