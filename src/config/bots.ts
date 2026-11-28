import type { MonsterName, ServerIdentifier, ServerRegion } from 'alclient';

export interface DefaultKeepMultipliers {
  /** Base copies kept for gear usable by multiple classes (doubled for dual-slot gear). */
  multiClass: number;
  /** Base copies kept for single-class combat gear (doubled for dual-slot gear). */
  singleCombatClass: number;
  /** Base copies kept for merchant-only gear. */
  merchant: number;
}

export interface BotsConfig {
  server: {
    region: ServerRegion;
    identifier: ServerIdentifier;
  };
  /** Character names to start on boot; each character's class is detected from AL.Game.characters. */
  characters: readonly string[];
  /** Character name that accepts party requests; defaults to the first configured character if omitted. */
  partyLeader?: string;
  /** Ordered fallback monsters to farm when no higher-priority hunt or special monster matches. */
  defaultMonsters: readonly MonsterName[];
  flags: {
    enableMonsterHunts: boolean;
    enableServerHops: boolean;
  };
  combat: {
    reserveMp: number;
  };
  items: {
    defaultKeepMultipliers: DefaultKeepMultipliers;
  };
}

export const botsConfig: BotsConfig = {
  characters: ['Warzair', 'Magzair', 'Ranzair'],
  combat: {
    reserveMp: 100,
  },
  defaultMonsters: ['minimush'],
  flags: {
    enableMonsterHunts: true,
    enableServerHops: false,
  },
  items: {
    defaultKeepMultipliers: {
      merchant: 1,
      multiClass: 4,
      singleCombatClass: 3,
    },
  },
  partyLeader: 'Warzair',
  server: {
    identifier: 'I',
    region: 'ASIA',
  },
};
