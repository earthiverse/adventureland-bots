import fs from "fs"

import { Character, PQData } from "alclient"
import { Strategy } from "../context.js"
import { suppress_errors } from "../logging.js"

export class TrackUpgradeStrategy implements Strategy<Character> {
    private onQ: (data: PQData) => void

    public onApply(bot: Character) {
        // Make directory
        const dir = `data/${bot.id}`
        fs.mkdir(dir, { recursive: true }, suppress_errors)

        this.onQ = (data) => {
            if (!data.q.upgrade) return // Not upgrade
            if (data.p.failure !== true && data.p.success !== true) return // Still rolling
            const slot = data.num
            const roll = parseFloat(`${data.p.nums[3]}${data.p.nums[2]}.${data.p.nums[1]}${data.p.nums[0]}`)

            // Append roll to file that's tracking what slot we upgraded
            fs.appendFile(`${dir}/${slot}`, roll.toFixed(2) + "\n", suppress_errors)
            console.debug(`rolled a ${roll.toFixed(2)} in slot ${slot}`)
        }
        bot.socket.on("q_data", this.onQ)
    }

    public onRemove(bot: Character) {
        if (this.onQ) bot.socket.removeListener("q_data", this.onQ)
    }
}