import type { Character } from "alclient";
import { EventBus } from "alclient";
import config from "../../config/config.js";
import { logDebug, logInformational } from "../utilities/logging.js";

/**
 * This plugin adds party support
 */

const { allowed, checkEveryMs, leader } = config.party;

const characters = new Set<Character>();

const partyLoop = async () => {
  try {
    const requests = [];
    for (const character of characters) {
      if (character.socket.disconnected) continue;

      if (character.id === leader) continue; // The leader only accepts requests
      if (character.party === leader) continue; // Already in the correct party

      requests.push(character.sendPartyRequest(leader));
    }
    await Promise.allSettled(requests);
  } catch (e) {
    if (e instanceof Error || typeof e === "string") logDebug(e);
  } finally {
    setTimeout(() => void partyLoop(), checkEveryMs);
  }
};
void partyLoop();

// Send party requests
EventBus.on("character_started", (character) => {
  characters.add(character);
  if (character.id !== leader) character.sendPartyRequest(leader).catch(logDebug);
});
EventBus.on("observer_stopped", (observer) => characters.delete(observer as Character));

// Accept party requests
EventBus.on("party_request_received", (character, name) => {
  if (
    allowed === true || // We're accepting everyone
    allowed.includes(name) // They're in our list
  ) {
    character.acceptPartyRequest(name).catch(logDebug);
  } else {
    logInformational(`Ignoring party request from ${name}`);
  }
});
