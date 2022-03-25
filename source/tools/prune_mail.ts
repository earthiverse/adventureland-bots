import AL from "alclient"
import fs from "fs"

// 2 Months
const KEEP_NEWER_THAN_MS = 1000 * 60 * 60 * 24 * 60

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    console.log("Grabbing all mail...")
    const mail = await AL.Game.getMail(true)
    const file = `mail_${Date.now()}.json`
    console.log(`  All mail retrieved! Saving ${mail.length} messages to ${file}.`)
    fs.writeFileSync(file, JSON.stringify(mail))

    for (const message of mail) {
        if (Date.now() - new Date(message.sent).getTime() < KEEP_NEWER_THAN_MS) continue // It's recent
        if (message.item && !message.taken) continue // We haven't taken the item yet
        console.log(message)
        console.log(`Deleting ${message.id}... ${await AL.Game.deleteMail(message.id)}`)
    }
})