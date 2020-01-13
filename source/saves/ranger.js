import('http://localhost:3000/ranger.js')
    .then((module) => {
        bots.ranger.run()
    }, (fail) => {
        load_code("ranger")
        bots.ranger.run()
    })

let scripts = {
    "earthWar": "warrior_start",
    "earthPri": "priest_start",
	// "earthMag": "mage_start",
	"earthMer": "merchant_start"
}
for (let character in scripts) {
    if (!parent.party[character])
        start_character(character, scripts[character])
}

function on_cm(name, data) {
    bots.ranger.parse_cm(name, data);
}

pause();