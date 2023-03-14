import AL, { CMData, Warrior } from "alclient"
import { LOOP_MS } from "./general"

/**
 * NOTE: Not implemented yet.
 * The idea is to have one bot be a 'stompController' and have other bots be 'stompHelpers'.
 */

export function startStompController(bot: Warrior): void {
    const numHelpers = 0

    async function stompControllerLoop() {
        // TODO: Implement
    }
}

export function startStompHelper(bot: Warrior, controller: string): void {
    // TODO: Get updated information from controller
    const stompSettings = {
        range: 100
    }

    // Listen for CMs
    bot.socket.on("cm", (data: CMData) => {
        if (data.name !== controller) return // Message is not from our controller

        try {
            // Parse the message
            const newStompSettings = JSON.parse(data.message)

            // Verify the message
            // TODO

            // Set new settings
            for (const newSetting in newStompSettings) {
                stompSettings[newSetting] = newStompSettings[newSetting]
            }
        } catch (e) {
            console.error(e)
        }
    })

    async function stompLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (
                bot.players.has(controller)
                && AL.Tools.distance(bot.players.get(controller), bot) <= stompSettings.range
            ) {
                // TODO: Implement this
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("stomphelperloop", setTimeout(stompLoop, Math.max(LOOP_MS, bot.getCooldown("stomp"))))
    }
    stompLoop()
}