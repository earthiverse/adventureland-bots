import type { Entity, PingCompensatedCharacter } from 'alclient';

/**
 * Factory that returns an entity comparator for target prioritization.
 */
export type TargetPrioritizer = (bot: PingCompensatedCharacter) => (a: Entity, b: Entity) => number;
