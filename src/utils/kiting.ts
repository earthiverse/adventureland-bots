import { type IPosition, type MonsterName, Pathfinder } from 'alclient';

export interface MovingPosition extends IPosition {
  moving?: boolean | undefined;
  going_x?: number | undefined;
  going_y?: number | undefined;
}

export interface FindKitePositionOptions {
  botPosition: MovingPosition;
  targetPosition: IPosition;
  kiteDistance: number;
  canStand?: (position: IPosition) => boolean;
  canWalkPath?: (from: IPosition, to: IPosition) => boolean;
  numAngles?: number;
  lookMargin?: number;
  /** Preferred angular direction when stepping away from baseAngle (1 = CCW, -1 = CW). */
  preferredTurn?: 1 | -1 | undefined;
}

/**
 * Determines the orbital turn direction around a target from a moving position's heading.
 */
export function getPreferredTurn(botPosition: MovingPosition, targetPosition: IPosition): 1 | -1 | undefined {
  if (!botPosition.moving || botPosition.going_x === undefined || botPosition.going_y === undefined) {
    return undefined;
  }

  const vx = botPosition.going_x - botPosition.x;
  const vy = botPosition.going_y - botPosition.y;
  if (vx === 0 && vy === 0) return undefined;

  const rx = botPosition.x - targetPosition.x;
  const ry = botPosition.y - targetPosition.y;
  return rx * vy >= ry * vx ? 1 : -1;
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
  canWalkPath = (from: IPosition, to: IPosition) => Pathfinder.canWalkPath(from, to),
  numAngles = 40,
  lookMargin = 1.25,
  preferredTurn = getPreferredTurn(botPosition, targetPosition) ?? 1,
}: FindKitePositionOptions): IPosition | undefined {
  const baseAngle = Math.atan2(botPosition.y - targetPosition.y, botPosition.x - targetPosition.x);
  const lookDistance = kiteDistance * lookMargin;

  const pointAt = (cos: number, sin: number, distance: number): IPosition => ({
    map: botPosition.map,
    x: targetPosition.x + distance * cos,
    y: targetPosition.y + distance * sin,
  });

  let walkableFallback: IPosition | undefined;
  let clearanceFallback: IPosition | undefined;
  let standFallback: IPosition | undefined;

  for (let i = 0; i < numAngles; i++) {
    // Offsets: 0, +1, -1, +2, -2 ... steps around the circle (biased by preferredTurn)
    let step = 0;
    if (i > 0) {
      const sign = i % 2 === 1 ? preferredTurn : -preferredTurn;
      step = Math.ceil(i / 2) * sign;
    }
    const angle = baseAngle + (step * 2 * Math.PI) / numAngles;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const kitePos = pointAt(cos, sin, kiteDistance);
    if (!canStand(kitePos)) continue;

    const isWalkable = canWalkPath(botPosition, kitePos);
    const lookPos = pointAt(cos, sin, lookDistance);
    const hasClearance = canStand(lookPos) && canWalkPath(kitePos, lookPos);

    if (isWalkable && hasClearance) {
      return kitePos;
    }

    if (isWalkable) {
      // Directly reachable even if tight against a wall
      walkableFallback ??= kitePos;
    } else if (hasClearance) {
      // Needs smartMove around an obstacle, but has open space behind it
      clearanceFallback ??= kitePos;
    } else {
      standFallback ??= kitePos;
    }
  }

  return walkableFallback ?? clearanceFallback ?? standFallback;
}
