import AL, { CharacterType } from "alclient"
import axios from "axios"

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    const playerNames: string[] = []
    const done = new Set<string>()
    for (const result of await AL.PlayerModel.find({ $or: [{ owner: { $regex: "[A-Za-z]" } }, { owner: undefined }] }, { name: 1 }).exec()) playerNames.push(result.name)
    for (let i = 0; i < playerNames.length; i++) {
        const player = playerNames[i]
        try {
            let owner: string

            if (done.has(owner)) continue

            if (/[1-9]?\d+/.test(player)) {
                console.log(`${player} is an entity. Removing...`)
                await AL.PlayerModel.deleteOne({ name: player }).exec()
                continue
            }

            console.log(`Researching ${player}...`)

            const data = await axios.get(`http://adventure.land/player/${player}`)

            // Get owner ID
            for (const cookie of data.headers["set-cookie"] || []) {
                const result = /^referrer=(\d+?);/.exec(cookie)
                if (result) {
                    // We found the owner
                    owner = result[1]
                    break
                }
            }
            if (!owner) {
                console.log(`Could not find an owner for ${player}`)
                continue
            }

            // Get slots
            const regex = /<script>\s+var slots.+?=(.+?);\s*<\/script>.+?Name:<\/span>\s*(.+?)<\/div>.+?Class:<\/span>\s*(.+?)<\/div>.+?Level:<\/span>\s*(\d+?)<\/div>.+?<\/span>\s*<\/div>/gms
            let match: RegExpExecArray
            while ((match = regex.exec(data.data)) !== null) {
                if (match.index === regex.lastIndex) regex.lastIndex++

                const slots = JSON.parse(match[1])
                const name = match[2]
                const type = match[3].toLowerCase()
                const level = Number.parseInt(match[4])

                if (done.has(name)) continue

                console.log(`  Updating ${name}...`)
                await AL.PlayerModel.updateOne({
                    name: name
                }, {
                    level: level,
                    name: name,
                    owner: owner,
                    type: type as CharacterType
                }).exec()
                done.add(name)
            }
        } catch (e) {
            console.error(e)
        }
    }

    try { await AL.Database.disconnect() } catch (e) { /** Ignore disconnect error */ }
})