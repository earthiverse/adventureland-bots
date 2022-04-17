import AL from "alclient"

const ONE_HOUR_IN_MS = 3.6e+6
const ONE_DAY_IN_MS = 8.64e+7
const ONE_WEEK_IN_MS = 6.048e+8
const ONE_MONTH_IN_MS = 2.628e+9
const ONE_YEAR_IN_MS = 3.156e+10

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    const oneWeekAgo = Date.now() - ONE_WEEK_IN_MS
    const oneMonthAgo = Date.now() - ONE_MONTH_IN_MS
    const oneYearAgo = Date.now() - ONE_YEAR_IN_MS

    let lastName = undefined
    let lastDate = undefined
    const idsToDelete: string[] = []
    console.log("Pruning achievements...")
    // eslint-disable-next-line sort-keys
    for (const achievement of await AL.AchievementModel.find({}, { _id: 1, name: 1, date: 1 }).sort({ name: 1, date: -1 }).lean().exec()) {
        if (achievement.name !== lastName) {
            // This is the latest data we have for the user, we want to keep it.
            lastName = achievement.name
            lastDate = achievement.date
            continue
        }

        if (achievement.date <= oneYearAgo) {
            // Over 1 year old -- Keep weekly
            if (lastDate - achievement.date < ONE_WEEK_IN_MS) {
                // Delete this hourly data
                console.log(`deleting ${achievement.name} @ ${achievement.date} (over 1 year, same week) (${achievement._id})`)
                idsToDelete.push(achievement._id)
                continue
            }
        } else if (achievement.date <= oneMonthAgo) {
            // Over one month old -- Keep daily
            if (lastDate - achievement.date < ONE_DAY_IN_MS) {
                // Delete this hourly data
                console.log(`deleting ${achievement.name} @ ${achievement.date} (over 1 month, same day) (${achievement._id})`)
                idsToDelete.push(achievement._id)
                continue
            }
        } else if (achievement.date <= oneWeekAgo) {
            // Over one week old -- Keep hourly
            if (lastDate - achievement.date < ONE_HOUR_IN_MS) {
                // Delete this hourly data
                console.log(`deleting ${achievement.name} @ ${achievement.date} (over 1 week, same hour) (${achievement._id})`)
                idsToDelete.push(achievement._id)
                continue
            }
        } else {
            // Less than 1 week old -- Keep 15 minutes
            if (lastDate - achievement.date < 900000) {
                // Delete this 15 minute data
                console.log(`deleting ${achievement.name} @ ${achievement.date} (within 1 week, same 15 minute interval) (${achievement._id})`)
                idsToDelete.push(achievement._id)
                continue
            }
        }

        // We want to keep this achievement
        lastDate = achievement.date
    }

    await AL.AchievementModel.deleteMany({
        _id: { $in: idsToDelete }
    }).lean().exec()

    AL.Database.disconnect()
})