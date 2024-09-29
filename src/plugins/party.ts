import { Character, EventBus } from "alclient";
import config from "config";
import { logDebug, logInformational } from "../utilities/logging.js";

/**
 * This plugin adds party support
 */

const CHECK_EVERY_MS = config.get<number>("party.checkEveryMs");
const ALLOWED = config.get<string[] | true>("party.allowed");
const LEADER = config.get<string>("party.leader");

const characters = new Set<Character>();

const partyLoop = async () => {
  try {
    const requests = [];
    for (const character of characters) {
      if (character.socket.disconnected) continue;

      if (character.id === LEADER) continue; // The leader only accepts requests
      if (character.party === LEADER) continue; // Already in the correct party

      requests.push(character.sendPartyRequest(LEADER));
    }
    await Promise.allSettled(requests);
  } catch (e) {
    logDebug(e as Error);
  } finally {
    setTimeout(() => void partyLoop(), CHECK_EVERY_MS);
  }
};
void partyLoop();

// Send party requests
EventBus.on("character_started", (character) => {
  characters.add(character);
  if (character.id !== LEADER) character.sendPartyRequest(LEADER).catch(logDebug);
});
EventBus.on("observer_stopped", (observer) => characters.delete(observer as Character));

// Accept party requests
EventBus.on("party_request_received", (character, name) => {
  if (
    ALLOWED === true || // We're accepting everyone
    ALLOWED.includes(name) // They're in our list
  ) {
    character.acceptPartyRequest(name).catch(logDebug);
  } else {
    logInformational(`Ignoring party request from ${name}`);
  }
});
