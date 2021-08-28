import AL from "alclient"
import { Table } from "console-table-printer"
import { RowOptionsRaw } from "console-table-printer/dist/src/utils/table-helpers"

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    const info = new Table({
        sort: (row1, row2) => { return row2.level - row1.level }
    })
    for (const cName in AL.Game.characters) {
        const character = AL.Game.characters[cName]
        const opts: RowOptionsRaw = { color: undefined }
        switch (character.type) {
        case "mage":
            opts.color = "blue"
            break
        case "merchant":
            opts.color = "cyan"
            break
        case "paladin":
            opts.color = "white"
            break
        case "priest":
            opts.color = "magenta"
            break
        case "ranger":
            opts.color = "green"
            break
        case "rogue":
            opts.color = "yellow"
            break
        case "warrior":
            opts.color = "red"
            break
        }
        // eslint-disable-next-line sort-keys
        info.addRow({ name: character.name, type: character.type, level: character.level, online: character.online ? "online" : undefined }, opts)
    }
    info.printTable()

    AL.Database.disconnect()
})