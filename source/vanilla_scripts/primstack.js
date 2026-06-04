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
    await upgrade(luckySlot, null, primlingSlot)
    calc = await upgrade(luckySlot, null, primlingSlot, true)
    log(`Current grace: ${calc.grace}`)
}
