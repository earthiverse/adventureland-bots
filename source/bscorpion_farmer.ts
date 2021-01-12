import AL from "alclient"

/** Config */
const merchantName = "earthMer"
const priestName = "earthPri"
const mageName = "earthMag"
const rangerName = "earthiverse"
const region: AL.ServerRegion = "ASIA"
const identifier: AL.ServerIdentifier = "I"

let merchant: AL.Merchant
let priest: AL.Priest
let mage: AL.Mage
let ranger: AL.Ranger

async function startRanger(ranger: AL.Ranger) {
    async function attackLoop() {
        try {
            const nearby = ranger.getNearestMonster("bscorpion")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, ranger.getCooldown("attack"))
    }
    attackLoop()

    const bscorpionSpawn = ranger.locateMonster("bscorpion")[0]
    async function moveLoop() {
        try {
            if (AL.Pathfinder.canWalk(ranger.character, bscorpionSpawn)) {
                const forces: { strength: number, angle: number }[] = []

                // Force #1: Towards the center of the bscorpion spawn
                const spawnStrength = (AL.Tools.distance(ranger.character, bscorpionSpawn) - (ranger.character.range / 2))
                const spawnAngle = Math.atan2(bscorpionSpawn.y - ranger.character.y, bscorpionSpawn.x - ranger.character.x)
                forces.push({ strength: spawnStrength, angle: spawnAngle })

                // Force #2: Perpendicular to  the center of the bscorpion spawn (so we move in a circle)
                const circleStrength = ranger.character.speed
                const circleAngle = spawnAngle + Math.PI / 4
                forces.push({ strength: circleStrength, angle: circleAngle })

                // Force #3: Away from the bscorpion

                // Add up all the forces and move
                let newX = ranger.character.x
                let newY = ranger.character.y
                for (const force of forces) {
                    newX += Math.cos(force.angle) * force.strength
                    newY += Math.sin(force.angle) * force.strength
                }
                await ranger.move(newX, newY)
                console.log(forces)
            } else {
                // Move to the bscorpion spawn
                await ranger.smartMove(bscorpionSpawn, { getWithin: ranger.character.range / 2 })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function startPriest(priest: AL.Priest) {
    async function moveLoop() {
        try {
            await priest.smartMove("main")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function startMage(mage: AL.Mage) {
    async function moveLoop() {
        try {
            await mage.smartMove("main")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function startMerchant(merchant: AL.Merchant) {
    async function moveLoop() {
        try {
            await merchant.smartMove("main")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Pathfinder.prepare()])

    // Start all characters
    console.log("Connecting...")
    let merchantP = AL.Game.startMerchant(merchantName, region, identifier)
    let priestP = AL.Game.startPriest(priestName, region, identifier)
    let mageP = AL.Game.startMage(mageName, region, identifier)
    let rangerP = AL.Game.startRanger(rangerName, region, identifier)
    merchant = await merchantP
    priest = await priestP
    mage = await mageP
    ranger = await rangerP

    const reconnect = async (character: AL.PingCompensatedCharacter) => {
        console.log(`Reconnecting ${character.character.id}...`)
        character.disconnect()
        character.connect()
        character.socket.on("disconnect", () => { reconnect(character) })
    }

    merchant.socket.on("disconnect", () => { reconnect(merchant) })
    priest.socket.on("disconnect", () => { reconnect(priest) })
    mage.socket.on("disconnect", () => { reconnect(mage) })
    ranger.socket.on("disconnect", () => { reconnect(ranger) })

    startMerchant(merchant)
    startPriest(priest)
    startMage(mage)
    startRanger(ranger)
}
run()