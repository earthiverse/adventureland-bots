/* eslint-disable no-undef */
const LEADER = "earthiverse"
async function moveLoop() {
    try {
        let target = parent.entities[LEADER] // Leader nearby
        if (!target) target = parent.party?.[LEADER] // Leader not nearby, use partyData to get approximate location
        if (!target) return // Cannot locate leader

        // Offset position based on index in party
        const offsetIndex = (parent.party_list ?? []).indexOf(character.id)
        switch (offsetIndex) {
            case 1:
                await smart_move({ map: target.map, x: target.x - 25, y: target.y })
                break
            case 2:
                await smart_move({ map: target.map, x: target.x + 25, y: target.y })
                break
            case 3:
                await smart_move({ map: target.map, x: target.x, y: target.y + 25 })
                break
            case 4:
                await smart_move({ map: target.map, x: target.x, y: target.y - 25 })
                break
            default:
                break
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(moveLoop, 250)
    }
}
moveLoop()
