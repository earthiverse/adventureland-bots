import AL from "alclient"
import { sleep } from "../base/general.js"

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    const merchant = await AL.Game.startMerchant("earthMer2", "ASIA", "I")

    const unknownOwners = await AL.PlayerModel.find({
        owner: undefined
    }, { name: 1 }).sort({ lastSeen: "desc" }).lean().exec()
    for (const unknownOwner of unknownOwners) {
        try {
            const data = await merchant.unfriend(`${unknownOwner.name}`)

            if (data.event == "lost") {
                console.log(`${unknownOwner.name} belongs to ${data.name}`)
                await AL.PlayerModel.updateOne({ name: unknownOwner.name }, { owner: data.name })
            } else {
                console.info(data)
            }
        } catch (e) {
            /** TODO: If the character no longer exists, delete it */

            console.error(`Couldn't unfriend ${unknownOwner.name}`)
            console.error(e)
            await sleep(5000)
        }
    }

    merchant.disconnect()
    AL.Database.disconnect()
})