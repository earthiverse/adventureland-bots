import type { PingCompensatedCharacter } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { HoldPositionMoveStrategy } from '@/strategies/move/hold_position';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import { ScareStrategy } from '@/strategies/scare';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';
import { furthestPrioritization } from '@/utils/targeting';

const PRAT_ATTACK_STRATEGY = new AttackStrategy({ prioritization: furthestPrioritization, type: 'prat' });
const PRAT_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'prat' });
const PRAT_HOLD_1_MOVE_STRATEGY = new HoldPositionMoveStrategy({ location: { map: 'level1', x: -281, y: 541 } });
const PRAT_HOLD_2_MOVE_STRATEGY = new HoldPositionMoveStrategy({ location: { map: 'level1', x: -327, y: 557 } });
const PRAT_SCARE_STRATEGY = new ScareStrategy({
  condition: (bot) =>
    !!bot.getEntity({
      type: 'prat',
      canWalkTo: true,
      returnNearest: true,
      withinRange: bot.G.monsters.prat.range + 30,
    }),
});

const require = (bot: PingCompensatedCharacter): boolean => bot.range > bot.G.monsters.prat.range + 25; // Enough range to kite

// TODO: Actual strategies per class
// TODO: Remove cheese move strategy,
//       Add a scare if close strategy

export const pratSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['prat'] }),
    configs: [
      {
        ctype: 'ranger',
        require,
        strategies: [PRAT_SCARE_STRATEGY, PRAT_RANGER_ATTACK_STRATEGY, PRAT_HOLD_1_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['prat'] }),
    configs: [
      {
        require,
        strategies: [PRAT_SCARE_STRATEGY, PRAT_ATTACK_STRATEGY, PRAT_HOLD_2_MOVE_STRATEGY],
      },
    ],
  },
];
