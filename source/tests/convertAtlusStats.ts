import fs from "fs"
import path from "path"

const input = "../data/atlus_json"
const output = "../data/atlus"

const data = {}

for (const file of fs.readdirSync(input)) {
    if (!file.endsWith(".json")) continue

    const contents = fs.readFileSync(path.join(input, file), "utf8")
    const json = JSON.parse(contents)

    for (const entry of json) {
        const roll = (entry.roll / 1000).toFixed(2).padStart(5, "0")
        if (!data[entry.slot]) data[entry.slot] = [roll]
        else data[entry.slot].push(roll)
    }
}

for (const roll in data) {
    fs.writeFileSync(path.join(output, roll), data[roll].join("\n"))
}
