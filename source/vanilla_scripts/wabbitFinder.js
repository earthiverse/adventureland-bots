setInterval(() => {
    for (const id in parent.entities) {
        const entity = parent.entities[id]

        if (entity.mtype == "wabbit") {
            game_log(`wabbit found: ${id}`)
        }
    }
}, 500)