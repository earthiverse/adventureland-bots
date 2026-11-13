import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const ICEROAMER_ATTACK_STRATEGY = new AttackStrategy({ type: 'iceroamer' });
const ICEROAMER_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'iceroamer' });
const ICEROAMER_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'iceroamer' });

// TODO: Actual strategies per class
// TODO: require with minimum stats

export const iceroamerSetups: Setups = [
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['iceroamer'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [ICEROAMER_RANGER_ATTACK_STRATEGY, ICEROAMER_MOVE_STRATEGY],
      },
    ],
  },
  {
    priority: (bots) => getPriority(bots, { typeList: ['iceroamer'] }),
    configs: [
      {
        strategies: [ICEROAMER_ATTACK_STRATEGY, ICEROAMER_MOVE_STRATEGY],
      },
    ],
  },
];
