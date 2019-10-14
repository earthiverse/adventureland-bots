import('http://localhost:3000/ranger.js')
    .then((module) => {
        module.ranger.run()
    });

for(let character of ["earthWar", "earthMag", "earthMer"]) {
    if(!parent.party[character])
        start_character(character)
}