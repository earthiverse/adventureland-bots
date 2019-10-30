import('http://localhost:3000/warrior.js')
    .then((module) => {
        bots.warrior.run()
    }, (fail) => {
		load_code("warrior")
		bots.warrior.run()
	})

function on_party_invite(name) {
    if (name != "earthiverse") return;
    accept_party_invite(name);
}

function on_cm(name, data) {
	bots.warrior.parse_cm(name, data);
}