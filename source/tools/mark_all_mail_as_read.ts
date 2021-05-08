import AL from "alclient-mongo"
import fs from "fs"

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    console.log("Grabbing all mail...")
    const mail = await AL.Game.getMail(true)
    console.log(`  All mail retrieved! Saving ${mail.length} messages to mail.json.`)
    fs.writeFileSync("mail.json", JSON.stringify(mail))

    // Mark all messages as read
    for (const message of mail) {
        console.log(await AL.Game.markMailAsRead(message.id))
    }
})