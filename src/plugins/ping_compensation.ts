import type { Observer } from "alclient";
import { EventBus } from "alclient";
import type { CharacterEntityQInfos, ConditionKey, StatusInfoBase } from "typed-adventureland";
import config from "../../config/config.js";
import { logDebug } from "../utilities/logging.js";

/**
 * This plugin adds ping compensation.
 */

const { maxPings, pingEveryMs } = config.pingCompensation;

const observers = new Set<Observer>();
/** key -> index of next ping to overwrite in pings */
const pingIndexes = new Map<string, number>();
/** key -> list of last maxPings pings */
const pings = new Map<string, number[]>();
/** key -> minimum ping */
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
    if (e instanceof Error || typeof e === "string") logDebug(e);
  } finally {
    setTimeout(() => void pingLoop(), pingEveryMs);
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
  if (serverPings.length < maxPings) {
    // We don't have the maximum number of pings yet
    serverPings.push(ping);
  } else {
    // We have reached the maximum number of pings, overwrite old entries
    const serverPingIndex = pingIndexes.get(key) ?? 0;
    serverPings[serverPingIndex] = ping;
    pingIndexes.set(key, (serverPingIndex + 1) % maxPings);
  }
  pings.set(key, serverPings);
  minPings.set(key, Math.min(...serverPings));
});

// Ping compensation for skill cooldowns
EventBus.on("next_skill_set", (character, skill, when) => {
  const key = `${character.server.key}${character.server.name}`;
  const ping = minPings.get(key);
  if (ping === undefined) return;
  character.setNextSkill(skill, when - ping);
});

// Ping compensation for `Character.s`
EventBus.on("conditions_set", (character, s) => {
  const key = `${character.server.key}${character.server.name}`;
  const ping = minPings.get(key);
  if (ping === undefined) return;
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
  if (ping === undefined) return;
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
  if (ping === undefined) return;

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
