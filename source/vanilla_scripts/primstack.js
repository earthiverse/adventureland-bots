const primlingSlot = locate_item("offeringp")
if (primlingSlot < 0) {
    log("No offeringp!")
    return
}

// TODO: Change item name, item level, and target grace
const itemSlot = locate_item("horsecapeg")
if (character.items[itemSlot].level !== 6) {
    log(`Wrong item level`)
    return
}
const targetGrace = 6.2

// primstack
let calc = await upgrade(luckySlot, null, primlingSlot, true)
log(`Initial grace: ${calc.grace}`)
while (calc.grace < targetGrace) {
    if (character.items[primlingSlot]?.name !== "offeringp") {
        log("No offeringp!")
        return
    }
    const item = character.items[luckySlot]
    const grade = item_grade(item)
    let scrollSlot = null
    if (G.items[item.name]?.stat && grade <= 2 && Math.round((targetGrace - calc.grace) * 10) > 5) {
        const needed = 10 ** grade
        scrollSlot = locate_item("strscroll")
        if (scrollSlot < 0 || (character.items[scrollSlot]?.q ?? 1) < needed) {
            const currentQ = scrollSlot >= 0 ? (character.items[scrollSlot]?.q ?? 1) : 0
            await buy("strscroll", needed - currentQ)
            scrollSlot = locate_item("strscroll")
        }
    }
    await upgrade(luckySlot, scrollSlot, primlingSlot)
    calc = await upgrade(luckySlot, null, primlingSlot, true)
    log(`Current grace: ${calc.grace}`)
}
