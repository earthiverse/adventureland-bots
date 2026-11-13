import { type IPosition, type MonsterName, Pathfinder } from 'alclient';

export interface FindKitePositionOptions {
  botPosition: IPosition;
  targetPosition: IPosition;
  kiteDistance: number;
  canStand?: (position: IPosition) => boolean;
  numAngles?: number;
  lookMargin?: number;
}

/**
 * Calculates a safe kiting distance from a target.
 */
export function calculateKiteDistance(
  botRange: number,
  target: { charge?: number | undefined; range: number; speed?: number | undefined },
  configuredDistance?: number,
): number {
  const maxAttackDistance = Math.max(25, botRange - 25);
  if (configuredDistance !== undefined) {
    return Math.min(maxAttackDistance, configuredDistance);
  }

  // Threat distance = monster speed/charge + attack range + safety margin
  const threatDistance = (target.charge ?? target.speed ?? 0) + target.range + 50;
  return Math.min(maxAttackDistance, Math.max(50, threatDistance));
}

/**
 * Checks whether an entity's monster type matches the requested type or typeList.
 */
export function matchesMonsterType(
  monsterType: MonsterName,
  filter?: { type?: MonsterName | undefined; typeList?: MonsterName[] | undefined },
): boolean {
  if (!filter) return true;
  return filter.type ? monsterType === filter.type : !filter.typeList || filter.typeList.includes(monsterType);
}

/**
 * Finds the best standable kiting position around a target.
 */
export function findKitePosition({
  botPosition,
  targetPosition,
  kiteDistance,
  canStand = (position: IPosition) => Pathfinder.canStand(position),
  numAngles = 40,
  lookMargin = 1.25,
}: FindKitePositionOptions): IPosition | undefined {
  const baseAngle = Math.atan2(botPosition.y - targetPosition.y, botPosition.x - targetPosition.x);
  const lookDistance = kiteDistance * lookMargin;

  const pointAt = (cos: number, sin: number, distance: number): IPosition => ({
    map: botPosition.map,
    x: targetPosition.x + distance * cos,
    y: targetPosition.y + distance * sin,
  });

  let fallbackPos: IPosition | undefined;

  for (let i = 0; i < numAngles; i++) {
    // Offsets: 0, +1, -1, +2, -2 ... steps around the circle
    const step = Math.ceil(i / 2) * (i % 2 === 1 ? 1 : -1);
    const angle = baseAngle + (step * 2 * Math.PI) / numAngles;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const kitePos = pointAt(cos, sin, kiteDistance);
    if (!canStand(kitePos)) continue;

    // Prioritize spots that have clearance behind them to avoid getting cornered
    const lookPos = pointAt(cos, sin, lookDistance);
    if (canStand(lookPos)) {
      return kitePos;
    }

    // Fall back to the nearest standable spot if no spots have rear clearance
    fallbackPos ??= kitePos;
  }

  return fallbackPos;
}
