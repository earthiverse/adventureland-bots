import AL from "alclient-mongo"

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const targetMonster: AL.MonsterName = "snake"

async function run() {
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Pathfinder.prepare()])
    const warrior = await AL.Game.startWarrior("earthWar2", "ASIA", "I")

    console.log(warrior.locateMonster(targetMonster))

    /**
     * Open chests from the monsters we kill
     */
    async function lootLoop() {
        while (true) {
            try {
                for (const [chestID,] of warrior.chests) {
                    await warrior.openChest(chestID)
                }
            } catch (e) {
                console.error(e)
            }
            await sleep(250) /* Wait a bit until the next loot */
        }
    }
    lootLoop()

    /**
     * Regenerate HP and MP from fighting monsters
     */
    async function regenLoop() {
        while (true) {
            try {
                const cooldown = warrior.getCooldown("use_hp")
                if (cooldown > 0) await sleep(cooldown) // Wait for regen to become ready

                const mpRatio = warrior.mp / warrior.max_mp
                const hpRatio = warrior.hp / warrior.max_hp

                if (hpRatio < mpRatio) {
                    await warrior.regenHP().catch(() => { /* Empty to suppress messages */ })
                } else {
                    await warrior.regenMP().catch(() => { /* Empty to suppress messages */ })
                }
            } catch (e) {
                console.error(e)
            }

            await sleep(250) /* Wait a bit until the next regen */
        }
    }
    regenLoop()

    /**
     * Move to nearby monsters
     */
    async function moveLoop() {
        while (true) {
            try {
                // console.log(`Finding nearest ${targetMonster} to move to`)
                // const nearestTarget = warrior.getNearestMonster(targetMonster)
                // if (!nearestTarget) {
                //     // Move to goo spawn
                //     console.log(`Moing to ${targetMonster}s`)
                //     await warrior.smartMove(targetMonster).catch(() => { /* Empty to suppress messages */ })
                // } else if (nearestTarget.distance > warrior.range) {
                //     console.log(`Moving to nearest ${targetMonster}`)
                //     warrior.smartMove(nearestTarget.monster).catch(() => { /* Empty to suppress messages */ })
                // }
                await warrior.smartMove(targetMonster)
                await warrior.smartMove("main")
                await warrior.smartMove(targetMonster)
                await warrior.smartMove("main", { avoidTownWarps: true })
            } catch (e) {
                console.error(e)
            }

            await sleep(250) /* Wait a bit until the next move */
        }
    }
    moveLoop()

    /**
     * Attack nearby monsters
     */
    async function attackLoop() {
        while (true) {
            try {
                const cooldown = warrior.getCooldown("attack")
                if (cooldown > 0) await sleep(cooldown) // Wait for attack to become ready

                if (warrior.canUse("attack")) {
                    const nearestTarget = warrior.getNearestMonster(targetMonster)
                    if (nearestTarget && nearestTarget.distance < warrior.range) {
                        // We're close enough to attack
                        console.log("attacking!")
                        await warrior.basicAttack(nearestTarget.monster.id).catch(() => { /* Empty to suppress messages */ })
                    }
                }
            } catch (e) {
                console.error(e)
            }

            await sleep(50) /* Wait a bit until the next attack */
        }
    }
    attackLoop()
}
run()