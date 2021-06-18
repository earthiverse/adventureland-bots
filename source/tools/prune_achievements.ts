import AL from "alclient-mongo"

const ONE_HOUR_IN_MS = 3.6e+6
const ONE_DAY_IN_MS = 8.64e+7
const ONE_WEEK_IN_MS = 6.048e+8
const ONE_MONTH_IN_MS = 2.628e+9
const ONE_YEAR_IN_MS = 3.154e+10

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    const oneDayAgo = Date.now() - ONE_DAY_IN_MS
    const oneWeekAgo = Date.now() - ONE_WEEK_IN_MS
    const oneMonthAgo = Date.now() - ONE_MONTH_IN_MS
    const oneYearAgo = Date.now() - ONE_YEAR_IN_MS

    let lastName = undefined
    let lastDate = undefined
    console.log("Pruning achievements...")
    // eslint-disable-next-line sort-keys
    for (const achievement of await AL.AchievementModel.find({}, { name: 1, date: 1 }).sort({ name: 1, date: -1 }).lean().exec()) {
        if (achievement.name !== lastName) {
            // This is the latest data we have for the user, we want to keep it.
            lastName = achievement.name
            lastDate = achievement.date
            console.log(`keeping ${achievement.name} @ ${achievement.date} (newest)`)
            continue
        }

        if (achievement.date > oneDayAgo) {
            // Keep all
            console.log(`keeping ${achievement.name} @ ${achievement.date} (within 1 day)`)
            continue
        } else if (achievement.date > oneWeekAgo) {
            // Keep hourly
            if (lastDate - achievement.date < ONE_HOUR_IN_MS) {
                // Delete this hourly data
                console.log(`deleting ${achievement.name} @ ${achievement.date} (within 1 week, same hour)`)
                await AL.AchievementModel.deleteOne({ date: achievement.date, name: achievement.name }).exec()
            } else {
                lastDate = achievement.date
                console.log(`keeping ${achievement.name} @ ${achievement.date} (within 1 week, different hour)`)
            }
        } else if (achievement.date > oneMonthAgo) {
            // Keep daily
            if (lastDate - achievement.date < ONE_DAY_IN_MS) {
                // Delete this hourly data
                console.log(`deleting ${achievement.name} @ ${achievement.date} (within 1 month, same day)`)
                await AL.AchievementModel.deleteOne({ date: achievement.date, name: achievement.name }).exec()
                // await await AL.AchievementModel.deleteOne()
            } else {
                lastDate = achievement.date
                console.log(`keeping ${achievement.name} @ ${achievement.date} (within 1 month, different day)`)
            }
        } else if (achievement.date > oneYearAgo) {
            // Keep weekly
            if (lastDate - achievement.date < ONE_WEEK_IN_MS) {
                // Delete this hourly data
                console.log(`deleting ${achievement.name} @ ${achievement.date} (within 1 year, same week)`)
                await AL.AchievementModel.deleteOne({ date: achievement.date, name: achievement.name }).exec()
            } else {
                lastDate = achievement.date
                console.log(`keeping ${achievement.name} @ ${achievement.date} (within 1 year, different week)`)
            }
        } else {
            // Keep monthly
            if (lastDate - achievement.date < ONE_MONTH_IN_MS) {
                // Delete this hourly data
                console.log(`deleting ${achievement.name} @ ${achievement.date} (over 1 year, same month)`)
                await AL.AchievementModel.deleteOne({ date: achievement.date, name: achievement.name }).exec()
            } else {
                lastDate = achievement.date
                console.log(`keeping ${achievement.name} @ ${achievement.date} (over 1 year, different year)`)
            }
        }
    }

    AL.Database.disconnect()
})