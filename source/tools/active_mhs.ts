import AL from "alclient"

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    console.log("Finding players with active MHs...")

    const data = await AL.PlayerModel.aggregate([
        {
            $match: {
                "s.monsterhunt.c": { $gt: 0 }, // Active MH
                lastSeen: { $gt: Date.now() - 60000 }, // Seen recently
            }
        }, {
            $addFields: {
                timeLeft: { $subtract: ["$s.monsterhunt.ms", { $subtract: [Date.now(), "$lastSeen"] }] },
                monster: "$s.monsterhunt.id"
            }
        }, {
            $match: {
                timeLeft: { $gt: 0 }
            }
        }, {
            $sort: {
                timeLeft: 1
            }
        }]
    ).exec()

    console.log(data)
    AL.Database.disconnect()
})