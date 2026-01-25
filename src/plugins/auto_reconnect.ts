import { Configuration, EventBus } from "alclient";
import { logDebug } from "../utilities/logging.js";

/**
 * This plugin automatically restarts characters if they get disconnected
 */

EventBus.on("character_started", (character) => {
  character.socket.on("disconnect", () => {
    try {
      // Reconnect
      setTimeout(() => character.socket.connect(), Configuration.SOCKET_RECONNECT_DELAY_MS);
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`auto_reconnect: ${e}`);
    }
  });
});

export default true;
