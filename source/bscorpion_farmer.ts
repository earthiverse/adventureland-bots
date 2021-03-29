import AL from "alclient"

/** Config */
const merchantName = "earthMer"
const ranger1Name = "earthiverse"
const ranger2Name = "earthRan2"
const ranger3Name = "earthRan3"
const region: AL.ServerRegion = "ASIA"
const identifier: AL.ServerIdentifier = "I"

let merchant: AL.Merchant
let ranger1: AL.Ranger
let ranger2: AL.Ranger
let ranger3: AL.Ranger

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
            if (AL.Pathfinder.canWalkPath(ranger, bscorpionSpawn)) {
                const forces: { strength: number, angle: number }[] = []

                // Force #1: Towards the center of the bscorpion spawn
                const spawnStrength = (AL.Tools.distance(ranger, bscorpionSpawn) - (ranger.range / 2))
                const spawnAngle = Math.atan2(bscorpionSpawn.y - ranger.y, bscorpionSpawn.x - ranger.x)
                forces.push({ strength: spawnStrength, angle: spawnAngle })

                const nearest = ranger.getNearestMonster("bscorpion")
                if (nearest) {
                    const bscorpion = nearest.monster
                    if (AL.Tools.distance(ranger, bscorpion) < bscorpion.range * 3) {
                        // Force #2: Away from the bscorpion
                        const bscorpionStrength = - Math.max(bscorpion.range * 3 - nearest.distance, ranger.range - bscorpion.speed)
                        const bscorpionAngle = Math.atan2(bscorpion.y - ranger.y, bscorpion.x - ranger.x)
                        forces.push({ strength: bscorpionStrength, angle: bscorpionAngle })

                        // Force #3: Perpendicular to the center of the bscorpion spawn (so we move in a circle) away from the bscorpion
                        const circleStrength = ranger.speed / 4
                        let circleAngle
                        if (bscorpionAngle > spawnAngle) {
                            circleAngle = spawnAngle - Math.PI / 2
                        } else {
                            circleAngle = spawnAngle + Math.PI / 2
                        }
                        forces.push({ strength: circleStrength, angle: circleAngle })
                    }
                }

                // Add up all the forces and move
                let newX = ranger.x
                let newY = ranger.y
                for (const force of forces) {
                    newX += Math.cos(force.angle) * force.strength
                    newY += Math.sin(force.angle) * force.strength
                }

                // TODO: Confirm that we need the empty function
                // We want to continuously move, so we don't mind the empty function
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                ranger.move(newX, newY).catch(() => { })
                console.log(forces)
            } else {
                // Move to the bscorpion spawn
                await ranger.smartMove(bscorpionSpawn, { getWithin: ranger.range / 2 })
            }
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
    const merchantP = AL.Game.startMerchant(merchantName, region, identifier)
    const ranger1P = AL.Game.startRanger(ranger1Name, region, identifier)
    const ranger2P = AL.Game.startRanger(ranger2Name, region, identifier)
    const ranger3P = AL.Game.startRanger(ranger3Name, region, identifier)
    merchant = await merchantP
    ranger1 = await ranger1P
    ranger2 = await ranger2P
    ranger3 = await ranger3P

    // Set up functionality to reconnect if we disconnect
    // TODO: Add a delay
    const reconnect = async (character: AL.PingCompensatedCharacter) => {
        console.log(`Reconnecting ${character.id}...`)
        await character.disconnect()
        await character.connect()
        character.socket.on("disconnect", async () => { await reconnect(character) })
    }
    merchant.socket.on("disconnect", async () => { await reconnect(merchant) })
    ranger1.socket.on("disconnect", async () => { await reconnect(ranger1) })
    ranger2.socket.on("disconnect", async () => { await reconnect(ranger2) })
    ranger3.socket.on("disconnect", async () => { await reconnect(ranger3) })

    // Start the characters
    startMerchant(merchant)
    startRanger(ranger1)
    startRanger(ranger2)
    startRanger(ranger3)
}
run()