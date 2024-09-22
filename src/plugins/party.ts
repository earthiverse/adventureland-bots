import { Character, EventBus } from "alclient";
import config from "config";

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
    // console.error("party error", e);
  } finally {
    setTimeout(partyLoop, CHECK_EVERY_MS);
  }
};
partyLoop();

// Send party requests
EventBus.on("character_started", (character) => {
  characters.add(character);
  if (character.id !== LEADER) {
    console.log(character.id, "is requesting its initial invite to", LEADER);
    character.sendPartyRequest(LEADER).catch();
  }
});

// Accept party requests
EventBus.on("party_request_received", (character, name) => {
  if (ALLOWED === true) return character.acceptPartyRequest(name).catch(); // We're accepting everyone
  if (ALLOWED.includes(name)) return character.acceptPartyRequest(name).catch(); // They're in our list

  // TODO: Log?
});
