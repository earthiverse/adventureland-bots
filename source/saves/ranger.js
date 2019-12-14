import('http://localhost:3000/ranger.js')
    .then((module) => {
        bots.ranger.run()
    }, (fail) => {
        load_code("ranger")
        bots.ranger.run()
    })

for (let character of ["earthWar", "earthMag", "earthMer"]) {
    if (!parent.party[character])
        start_character(character)
}

function on_cm(name, data) {
    bots.ranger.parse_cm(name, data);
}

pause();