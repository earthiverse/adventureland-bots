import type { CharacterType } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const FROG_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'frog' });
const FROG_MOVE_STRATEGY = new MoveStrategy({ targetType: 'frog' });
const MAGICAL_DAMAGE_CLASSES = ['mage', 'priest'] as const satisfies CharacterType[];

// TODO: Actual strategies per class

export const frogSetups: Setups = MAGICAL_DAMAGE_CLASSES.map((ctype) => ({
  priority: (bots) => getPriority(bots, { typeList: ['frog'] }),
  configs: [
    {
      ctype,
      strategies: [FROG_ATTACK_STRATEGY, FROG_MOVE_STRATEGY],
    },
  ],
}));
