import type { PingCompensatedCharacter } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { KiteMoveStrategy } from '@/strategies/move/kite';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { canKite } from '@/utils/combat';
import { getPriority } from '@/utils/priority';

const BIGBIRD_ATTACK_STRATEGY = new AttackStrategy({ type: 'bigbird' });
const BIGBIRD_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'bigbird' });
const BIGBIRD_MOVE_STRATEGY = new KiteMoveStrategy({ type: 'bigbird' });

const require = (bot: PingCompensatedCharacter): boolean => canKite(bot, 'bigbird');

// TODO: Actual strategies per class
// TODO: require with minimum stats

export const bigbirdSetups: Setups = [
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['bigbird'] }),
    configs: [
      {
        ctype: 'ranger',
        require,
        strategies: [BIGBIRD_RANGER_ATTACK_STRATEGY, BIGBIRD_MOVE_STRATEGY],
      },
    ],
  },
  {
    priority: (bots) => getPriority(bots, { typeList: ['bigbird'] }),
    configs: [
      {
        require,
        strategies: [BIGBIRD_ATTACK_STRATEGY, BIGBIRD_MOVE_STRATEGY],
      },
    ],
  },
];
