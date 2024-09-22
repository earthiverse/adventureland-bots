import { EventBus, Observer } from "alclient";
import config from "config";

/**
 * This plugin adds ping compensation.
 */

const MAX_PINGS = config.get("pingCompensation.maxPings") as number;
const PING_EVERY_MS = config.get("pingCompensation.pingEveryMs") as number;

const observers = new Set<Observer>();
const pings = new Map<string, number[]>();
const minPings = new Map<string, number>();

const pingLoop = async () => {
  try {
    for (const observer of observers) {
      if (observer.socket.disconnected) continue;

      observer.ping().catch();
    }
  } catch (e) {
    console.error(e);
  } finally {
    setTimeout(pingLoop, PING_EVERY_MS);
  }
};
pingLoop();

// Collect ping data
EventBus.on("observer_started", (observer) => {
  observers.add(observer);
  observer.ping().catch();
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
    const condition = s[conditionName];
    condition.ms -= ping;
    if (condition.ms <= 0) delete s["conditionName"];
  }
});

// Ping compensation for `Character.q`
EventBus.on("progress_set", (character, q) => {
  const key = `${character.server.key}${character.server.name}`;
  const ping = minPings.get(key);
  if (!ping) return;
  for (const progressName in q) {
    const progress = q[progressName];
    progress.ms -= ping;
    if (progress.ms <= 0) delete q["conditionName"];
  }
});
