import('http://localhost:3000/mage.js')
    .then((module) => {
        bots.mage.run()
    });

function on_party_invite(name) {
    if (name != "earthiverse") return;
    accept_party_invite(name);
}