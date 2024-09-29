import { EventBus, Observer } from "alclient";
import config from "config";
import type { ConditionKey, StatusInfoBase } from "typed-adventureland";
import type { CharacterEntityQInfos } from "typed-adventureland/dist/src/entities/character-entity.js";
import { logDebug } from "../utilities/logging.js";

/**
 * This plugin adds ping compensation.
 */

const MAX_PINGS = config.get<number>("pingCompensation.maxPings");
const PING_EVERY_MS = config.get<number>("pingCompensation.pingEveryMs");

const observers = new Set<Observer>();
const pings = new Map<string, number[]>();
const minPings = new Map<string, number>();

const pingLoop = async () => {
  try {
    const pings = [];
    for (const observer of observers) {
      if (observer.socket.disconnected) continue;

      pings.push(observer.ping());
    }
    await Promise.allSettled(pings);
  } catch (e) {
    logDebug(e as Error);
  } finally {
    setTimeout(() => void pingLoop(), PING_EVERY_MS);
  }
};
void pingLoop();

// Collect ping data
EventBus.on("observer_started", (observer) => {
  observers.add(observer);
  observer.ping().catch(logDebug);
});
EventBus.on("observer_stopped", (observer) => observers.delete(observer));
EventBus.on("ping", (_observer, server, ping) => {
  const key = `${server.key}${server.name}`;
  const serverPings = pings.get(key) ?? [];
  if (serverPings.unshift(ping) > MAX_PINGS) {
    serverPings.splice(MAX_PINGS - 1);
  }
  minPings.set(key, Math.min(...serverPings));
});

// Ping compensation for skill cooldowns
EventBus.on("next_skill_set", (character, skill, when) => {
  const key = `${character.server.key}${character.server.name}`;
  const ping = minPings.get(key);
  if (!ping) return;
  character.setNextSkill(skill, when - ping);
});

// Ping compensation for `Character.s`
EventBus.on("conditions_set", (character, s) => {
  const key = `${character.server.key}${character.server.name}`;
  const ping = minPings.get(key);
  if (!ping) return;
  for (const conditionName in s) {
    const condition = s[conditionName as ConditionKey] as StatusInfoBase;
    condition.ms -= ping;
    if (condition.ms <= 0) delete s[conditionName as ConditionKey];
  }
});

// Ping compensation for `Character.q`
EventBus.on("progress_set", (character, q) => {
  const key = `${character.server.key}${character.server.name}`;
  const ping = minPings.get(key);
  if (!ping) return;
  for (const progressName in q) {
    const progress = q[progressName as keyof CharacterEntityQInfos] as {
      ms: number;
    };
    progress.ms -= ping;
    if (progress.ms <= 0) delete q[progressName as keyof CharacterEntityQInfos];
  }
});

// Ping compensation for entity positions
EventBus.on("entities_updated", (observer, monsters, characters) => {
  const key = `${observer.server.key}${observer.server.name}`;
  const ping = minPings.get(key);
  if (!ping) return;

  for (const entity of [...monsters, ...characters]) {
    if (!entity.moving) continue;

    const distanceTraveled = (entity.speed * ping) / 1000;
    const yToGoal = entity.going_y - entity.y;
    const xToGoal = entity.going_x - entity.x;
    const distanceToGoal = Math.hypot(xToGoal, yToGoal);
    if (distanceTraveled >= distanceToGoal) {
      entity.updateData({ x: entity.going_x, y: entity.going_y });
    } else {
      const percentTraveled = distanceTraveled / distanceToGoal;
      entity.updateData({
        x: entity.x + xToGoal * percentTraveled,
        y: entity.y + yToGoal * percentTraveled,
      });
    }
  }
});
