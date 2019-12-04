import('http://localhost:3000/priest.js')
    .then((module) => {
        bots.priest.run()
    }, (fail) => {
		load_code("priest")
		bots.priest.run()
	})

function on_party_invite(name) {
    if (name != "earthiverse") return;
    accept_party_invite(name);
}

function on_cm(name, data) {
	bots.priest.parse_cm(name, data);
}