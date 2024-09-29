import { Configuration, EventBus } from "alclient";

/**
 * This plugin automatically restarts characters if they get disconnected
 */

EventBus.on("character_started", (character) => {
  character.socket.on("disconnect", () => {
    try {
      // Reconnect
      setTimeout(() => character.socket.connect(), Configuration.SOCKET_RECONNECT_DELAY_MS);
    } catch (e) {
      // console.error(e);
    }
  });
});

export default true;
