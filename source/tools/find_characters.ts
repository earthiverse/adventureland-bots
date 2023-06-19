import AL, { CharacterType, IPlayerDocument } from "alclient"
import axios, { AxiosResponse } from "axios"
import { getOwner, getPlayerInfo } from "./find.js"

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    const playerNames: string[] = []
    const done = new Set<string>()
    for (const result of await AL.PlayerModel.find({ $or: [{ owner: { $regex: "[A-Za-z]" } }, { owner: undefined }] }, { name: 1 }).exec()) playerNames.push(result.name)
    for (let i = 0; i < playerNames.length; i++) {
        const player = playerNames[i]

        if (done.has(player)) continue

        try {
            let owner: string

            if (Number.isInteger(player)) {
                console.log(`${player} is an entity. Removing...`)
                await AL.PlayerModel.deleteOne({ name: player }).exec()
                continue
            }

            console.log(`Researching ${player}...`)

            const data = await axios.get(`http://adventure.land/player/${player}`)

            // Get owner ID
            owner = getOwner(data)
            if (!owner) {
                console.log(`Could not find an owner for ${player}`)
                continue
            }

            for (const playerInfo of getPlayerInfo(data)) {
                if (done.has(playerInfo.name)) continue

                await AL.PlayerModel.updateOne({
                    name: playerInfo.name
                }, {
                    ...playerInfo,
                    owner: owner
                }).exec()

                done.add(playerInfo.name)
            }
        } catch (e) {
            console.error(e)
        }
    }

    try { await AL.Database.disconnect() } catch (e) { /** Ignore disconnect error */ }
})